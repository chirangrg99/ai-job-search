begin;
create function private.valid_parse_evidence(item jsonb, source text, has_priority boolean) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
begin
 if jsonb_typeof(item) is distinct from 'object' then return false; end if;
 if not (item ?& array['text','evidence']) or item - array['text','evidence','priority'] <> '{}' then return false; end if;
 if has_priority then
  if coalesce(item->>'priority','') not in ('required','preferred','unspecified','ambiguous') then return false; end if;
 elsif item ? 'priority' then return false;
 end if;
 return jsonb_typeof(item->'text')='string' and jsonb_typeof(item->'evidence')='string'
  and length(trim(item->>'text')) between 1 and 1500 and length(item->>'evidence') between 1 and 3000
  and position(item->>'text' in item->>'evidence')>0 and position(item->>'evidence' in source)>0;
end $$;
create function private.valid_job_parse(payload jsonb, source text) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text; item jsonb; s jsonb; amount numeric; nums numeric[];
 keys text[]:=array['title','company','location','employmentType','salary','responsibilities','requiredQualifications','preferredQualifications','skills','technologies','licences','certifications','educationRequirements','experienceRequirements','physicalRequirements','scheduleRequirements','workAuthorizationWording','ambiguities'];
begin
 if jsonb_typeof(payload) is distinct from 'object' or not(payload ?& keys) or payload-keys <> '{}' then return false; end if;
 foreach k in array array['title','company','location','employmentType','workAuthorizationWording'] loop
  if payload->k <> 'null' and not coalesce(private.valid_parse_evidence(payload->k,source,false),false) then return false; end if;
 end loop;
 foreach k in array array['responsibilities','requiredQualifications','preferredQualifications','skills','technologies','licences','certifications','educationRequirements','experienceRequirements','physicalRequirements','scheduleRequirements','ambiguities'] loop
  if jsonb_typeof(payload->k) is distinct from 'array' then return false; end if;
  if jsonb_array_length(payload->k)>60 then return false; end if;
  for item in select value from jsonb_array_elements(payload->k) loop
   if not coalesce(private.valid_parse_evidence(item,source,k<>'ambiguities'),false) then return false; end if;
   if k='requiredQualifications' and item->>'priority'<>'required' then return false; end if;
   if k='preferredQualifications' and item->>'priority'<>'preferred' then return false; end if;
  end loop;
 end loop;
 s:=payload->'salary';
 if s<>'null' then
  if jsonb_typeof(s) is distinct from 'object' or not(s ?& array['minimum','maximum','currency','period','evidence']) or s-array['minimum','maximum','currency','period','evidence']<>'{}' then return false; end if;
  if jsonb_typeof(s->'evidence') is distinct from 'string' or length(s->>'evidence') not between 1 and 3000 or position(s->>'evidence' in source)=0 then return false; end if;
  select array_agg(replace(m[1],',','')::numeric) into nums from regexp_matches(s->>'evidence','([0-9][0-9,]*(\.[0-9]+)?)','g') m;
  foreach k in array array['minimum','maximum'] loop
   if s->k<>'null' then
    if jsonb_typeof(s->k) is distinct from 'number' then return false; end if;
    amount:=(s->>k)::numeric;
    if amount<0 or amount>1000000000 or not coalesce(amount=any(nums),false) then return false; end if;
   end if;
  end loop;
  if (s->>'minimum')::numeric > (s->>'maximum')::numeric then return false; end if;
  if s->'currency'<>'null' and (jsonb_typeof(s->'currency') is distinct from 'string' or s->>'currency' !~ '^[A-Z]{3}$' or s->>'evidence' !~ ('\m'||(s->>'currency')||'\M')) then return false; end if;
  if s->'period'<>'null' then
   if coalesce(s->>'period','') not in ('hour','day','week','month','year') then return false; end if;
   if s->>'evidence' !~* (case s->>'period' when 'hour' then '\m(hour|hourly|hr)\M' when 'day' then '\m(day|daily)\M' when 'week' then '\m(week|weekly)\M' when 'month' then '\m(month|monthly)\M' else '\m(year|yearly|annual|annually|annum)\M' end) then return false; end if;
  end if;
 end if;
 return true;
exception when others then return false;
end $$;
revoke all on function private.valid_parse_evidence(jsonb,text,boolean),private.valid_job_parse(jsonb,text) from public,anon;
grant execute on function private.valid_parse_evidence(jsonb,text,boolean),private.valid_job_parse(jsonb,text) to authenticated,service_role;
create table public.job_description_parses (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
 job_id uuid not null, description_hash text not null check(description_hash ~ '^[a-f0-9]{64}$'),
 model text not null check(length(model) between 1 and 120), response_model text,
 prompt_version text not null, schema_version text not null,
 source_description text not null check(length(trim(source_description)) between 1 and 30000), description_complete boolean not null,
 status text not null check(status in ('processing','completed','failed')),
 parsed_output jsonb, analyzed_at timestamptz, error_code text,
 lease_token uuid not null default gen_random_uuid(), lease_expires_at timestamptz not null default now()+interval '120 seconds',
 attempts integer not null default 1 check(attempts between 1 and 3), retry_after timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(job_id,profile_id) references public.jobs(id,owner_profile_id) on delete cascade,
 unique(profile_id,job_id,description_hash,model,prompt_version,schema_version),
 check((status='completed' and parsed_output is not null and analyzed_at is not null and response_model is not null and coalesce(private.valid_job_parse(parsed_output,source_description),false)) or (status<>'completed' and parsed_output is null and analyzed_at is null))
);
create index job_description_parses_job_idx on public.job_description_parses(job_id,profile_id);
alter table public.job_description_parses enable row level security;
revoke all on public.job_description_parses from anon,authenticated;
grant select,insert,update on public.job_description_parses to authenticated;
grant all on public.job_description_parses to service_role;
create policy owner_access on public.job_description_parses for all to authenticated using(private.owns_profile(profile_id)) with check(private.owns_profile(profile_id));

create function public.claim_job_parse(target_job uuid, source_hash text, expected_description text, expected_complete boolean, requested_model text, requested_prompt text, requested_schema text, retry boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p uuid; j public.jobs; row public.job_description_parses; inserted uuid;
begin
 select id into p from public.candidate_profiles where user_id=(select auth.uid());
 if p is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into j from public.jobs where id=target_job and owner_profile_id=p;
 if not found then raise exception 'Job not found' using errcode='42501'; end if;
 if j.description is distinct from expected_description or coalesce((j.normalized_data->'raw'->>'descriptionComplete')::boolean,false) is distinct from expected_complete then raise exception 'Job changed; reload before parsing'; end if;
 insert into public.job_description_parses(profile_id,job_id,description_hash,model,prompt_version,schema_version,source_description,description_complete,status)
 values(p,target_job,source_hash,requested_model,requested_prompt,requested_schema,expected_description,expected_complete,'processing')
 on conflict(profile_id,job_id,description_hash,model,prompt_version,schema_version) do nothing returning id into inserted;
 select * into row from public.job_description_parses where profile_id=p and job_id=target_job and description_hash=source_hash and model=requested_model and prompt_version=requested_prompt and schema_version=requested_schema for update;
 if inserted is not null then return jsonb_build_object('state','claimed','id',row.id,'token',row.lease_token); end if;
 if row.status='completed' then return jsonb_build_object('state','cached','id',row.id,'output',row.parsed_output); end if;
 if row.status='processing' and row.lease_expires_at>now() then return jsonb_build_object('state','busy'); end if;
 if not retry or row.attempts>=3 or row.retry_after>now() then return jsonb_build_object('state','retry_required'); end if;
 update public.job_description_parses set status='processing',lease_token=gen_random_uuid(),lease_expires_at=now()+interval '120 seconds',attempts=attempts+1,error_code=null,retry_after=null,updated_at=now() where id=row.id returning * into row;
 return jsonb_build_object('state','claimed','id',row.id,'token',row.lease_token);
end $$;
revoke all on function public.claim_job_parse(uuid,text,text,boolean,text,text,text,boolean) from public,anon;
grant execute on function public.claim_job_parse(uuid,text,text,boolean,text,text,text,boolean) to authenticated;
commit;

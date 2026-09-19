begin;
alter table public.jobs add column posting_text text check(length(posting_text) between 1 and 50000), add column posting_text_origin text check(posting_text_origin in ('public_page','pasted')), add column posting_text_saved_at timestamptz;
alter table public.job_description_parses drop constraint job_description_parses_source_description_check;
alter table public.job_description_parses add constraint job_description_parses_source_description_check check(length(trim(source_description)) between 1 and 80000);
create function public.job_parse_source(target_job uuid) returns text language plpgsql stable security invoker set search_path='' as $$
declare j public.jobs; r jsonb;
begin
 select * into j from public.jobs where id=target_job and private.owns_profile(owner_profile_id);
 if not found then raise exception 'Job not found' using errcode='42501'; end if;
 r:=j.normalized_data->'raw';
 return jsonb_pretty(jsonb_build_object(
 'provider_metadata',jsonb_build_object('provider',j.provider,'external_id',j.external_job_id,'title',j.title,'company',j.company,'location',j.location,'country',j.country,'employment_type',j.employment_type,'remote_type',j.remote_type,'posted_at',j.posted_at,'salary_min',j.salary_min,'salary_max',j.salary_max,'salary_currency',j.salary_currency,'salary_period',r->>'salaryPeriod','salary_estimated',r->'salaryEstimated'),
 'provider_description',j.description,'provider_description_complete',coalesce((r->>'descriptionComplete')::boolean,false),
 'original_posting_text',j.posting_text,'original_posting_text_origin',j.posting_text_origin
 ));
end $$;
revoke all on function public.job_parse_source(uuid) from public,anon;
grant execute on function public.job_parse_source(uuid) to authenticated;
create or replace function public.claim_job_parse(target_job uuid, source_hash text, expected_description text, expected_complete boolean, requested_model text, requested_prompt text, requested_schema text, retry boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p uuid; j public.jobs; row public.job_description_parses; inserted uuid;
begin
 select id into p from public.candidate_profiles where user_id=(select auth.uid());
 if p is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into j from public.jobs where id=target_job and owner_profile_id=p;
 if not found then raise exception 'Job not found' using errcode='42501'; end if;
 if (case when requested_schema='2' then public.job_parse_source(target_job) else j.description end) is distinct from expected_description or coalesce((j.normalized_data->'raw'->>'descriptionComplete')::boolean,false) is distinct from expected_complete then raise exception 'Job changed; reload before parsing'; end if;
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
commit;

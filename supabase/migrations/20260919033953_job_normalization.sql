begin;
alter table public.jobs add column owner_profile_id uuid references public.candidate_profiles(id) on delete cascade,
 add column normalized_data jsonb,
 add column last_seen_at timestamptz not null default now(),
 add column deduplication_state text not null default 'new' check(deduplication_state in ('new','exact_duplicate','likely_duplicate','updated_existing')),
 add column likely_duplicate_of uuid,
 add constraint jobs_id_owner_key unique(id,owner_profile_id),
 add constraint jobs_likely_owner_fk foreign key(likely_duplicate_of,owner_profile_id) references public.jobs(id,owner_profile_id);
drop index public.jobs_provider_external_id_key;
create unique index jobs_provider_external_id_key on public.jobs(provider,external_job_id) where owner_profile_id is null and external_job_id is not null;
create unique index jobs_owner_provider_id_key on public.jobs(owner_profile_id,provider,external_job_id) where owner_profile_id is not null and external_job_id is not null;
create index jobs_owner_tuple_idx on public.jobs(owner_profile_id,normalized_company,normalized_title,normalized_location);
create index jobs_owner_url_idx on public.jobs(owner_profile_id,canonical_url);
create index jobs_owner_fingerprint_idx on public.jobs(owner_profile_id,fingerprint);
create index jobs_likely_owner_idx on public.jobs(likely_duplicate_of,owner_profile_id);
drop policy catalog_read on public.jobs;
create policy catalog_read on public.jobs for select to authenticated using(owner_profile_id is null or private.owns_profile(owner_profile_id));
create policy owner_insert on public.jobs for insert to authenticated with check(private.owns_profile(owner_profile_id));
create policy owner_update on public.jobs for update to authenticated using(private.owns_profile(owner_profile_id)) with check(private.owns_profile(owner_profile_id));
grant insert,update on public.jobs to authenticated;

create table public.job_provider_identities (
 profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
 provider text not null, external_id text not null, job_id uuid not null,
 primary key(profile_id,provider,external_id),
 foreign key(job_id,profile_id) references public.jobs(id,owner_profile_id) on delete cascade
);
create index job_provider_identities_job_idx on public.job_provider_identities(job_id,profile_id);
alter table public.job_provider_identities enable row level security;
revoke all on public.job_provider_identities from anon,authenticated;
grant select,insert on public.job_provider_identities to authenticated;
grant all on public.job_provider_identities to service_role;
create policy owner_access on public.job_provider_identities for all to authenticated using(private.owns_profile(profile_id)) with check(private.owns_profile(profile_id));
alter table public.job_discoveries drop constraint job_discoveries_status_check;
alter table public.job_discoveries add constraint job_discoveries_status_check check(status in ('pending_normalization','processed')),
 add column job_id uuid,
 add column deduplication_state text check(deduplication_state in ('new','exact_duplicate','likely_duplicate','updated_existing')),
 add column processed_at timestamptz,
 add constraint discovery_job_owner_fk foreign key(job_id,profile_id) references public.jobs(id,owner_profile_id);
create index job_discoveries_job_idx on public.job_discoveries(job_id,profile_id);
create index job_discoveries_pending_idx on public.job_discoveries(profile_id,received_at) where status='pending_normalization';

-- Invoker rights: RLS applies to every read/write; no service-role or privilege escalation.
create function public.normalize_discovery(discovery_id uuid, normalized jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.job_discoveries; j public.jobs; candidate public.jobs; target uuid; likely uuid;
 outcome text; profile uuid; raw jsonb; reliable boolean; strong boolean; candidates integer := 0;
begin
 select id into profile from public.candidate_profiles where user_id=(select auth.uid());
 if profile is null then raise exception 'Authentication required' using errcode='42501'; end if;
 -- Serialize the candidate's job collection, including concurrent manual/provider syncs.
 perform pg_advisory_xact_lock(hashtextextended(profile::text, 6));
 select * into d from public.job_discoveries where id=discovery_id and profile_id=profile for update;
 if not found then raise exception 'Discovery not found' using errcode='42501'; end if;
 if d.status='processed' then return jsonb_build_object('jobId',d.job_id,'state',d.deduplication_state); end if;
 raw := normalized->'raw';
 if raw is distinct from d.dto or normalized->>'version' is distinct from 'v1'
 or coalesce(normalized->>'fingerprint','') !~ '^v1:[a-f0-9]{64}$'
 or coalesce(normalized->>'signature','') !~ '^[a-f0-9]{64}$'
 or nullif(normalized->>'title','') is null then raise exception 'Invalid normalization payload'; end if;
 reliable := d.provider='adzuna' and coalesce((normalized->>'reliableId')::boolean,false);
 strong := coalesce((normalized->>'strongContent')::boolean,false);
 if reliable then
  select job_id into target from public.job_provider_identities where profile_id=profile and provider=d.provider and external_id=d.external_id;
 end if;
 if target is null then
  for candidate in select * from public.jobs where owner_profile_id=profile
   and ((coalesce((normalized->>'postingUrl')::boolean,false) and canonical_url=normalized->>'canonicalUrl') or fingerprint=normalized->>'fingerprint')
   order by discovered_at,id loop
   -- Conflicting reliable IDs represent separate postings/reposts, even with identical text.
   if reliable and exists(select 1 from public.job_provider_identities i where i.profile_id=profile and i.job_id=candidate.id and i.provider=d.provider and i.external_id<>d.external_id) then
    likely := candidate.id; continue;
   end if;
   if candidate.normalized_company is not distinct from normalized->>'company'
    and candidate.normalized_title is not distinct from normalized->>'title'
    and candidate.normalized_location is not distinct from normalized->>'location'
    and candidate.country is not distinct from raw->>'country'
    and ((coalesce((normalized->>'postingUrl')::boolean,false) and candidate.canonical_url=normalized->>'canonicalUrl')
      or (strong and coalesce((candidate.normalized_data->>'strongContent')::boolean,false) and candidate.fingerprint=normalized->>'fingerprint')) then
     target := candidate.id; candidates := candidates+1;
   else likely := candidate.id;
   end if;
  end loop;
  if candidates>1 then likely:=target; target:=null; end if;
 end if;
 if target is null then
  if likely is null and nullif(normalized->>'company','') is not null and nullif(normalized->>'location','') is not null then
   select id into likely from public.jobs where owner_profile_id=profile and normalized_company=normalized->>'company'
    and normalized_title=normalized->>'title' and normalized_location=normalized->>'location' and country is not distinct from raw->>'country' order by discovered_at,id limit 1;
  end if;
  outcome := case when likely is null then 'new' else 'likely_duplicate' end;
  insert into public.jobs(owner_profile_id,provider,external_job_id,title,company,location,country,discovered_at,last_seen_at,source_metadata,deduplication_state,likely_duplicate_of)
   values(profile,d.provider,case when reliable then d.external_id else null end,raw->>'title',raw->>'company',raw->>'location',raw->>'country',d.received_at,d.received_at,jsonb_build_object('first_original',raw),outcome,likely) returning id into target;
 else
  select * into j from public.jobs where id=target and owner_profile_id=profile;
  outcome := 'exact_duplicate';
  -- Updates come only from the primary source, never an unrelated cross-provider observation.
  if j.provider=d.provider and d.received_at>=j.last_seen_at and j.normalized_data->>'signature' is distinct from normalized->>'signature' then outcome:='updated_existing'; end if;
 end if;
 if outcome in ('new','likely_duplicate','updated_existing') then
  update public.jobs set title=raw->>'title',company=raw->>'company',location=raw->>'location',country=raw->>'country',
   normalized_company=normalized->>'company',normalized_title=normalized->>'title',normalized_location=normalized->>'location',
   description=raw->>'description',application_url=raw->>'applicationUrl',canonical_url=normalized->>'canonicalUrl',
   salary_min=(normalized->'salary'->>'min')::numeric,salary_max=(normalized->'salary'->>'max')::numeric,salary_currency=normalized->'salary'->>'currency',
   employment_type=normalized->>'employmentType',remote_type=raw->>'remoteType',posted_at=(raw->>'postedAt')::timestamptz,
   fingerprint=normalized->>'fingerprint',normalized_data=normalized,deduplication_state=outcome
  where id=target and owner_profile_id=profile;
 end if;
 update public.jobs set last_seen_at=greatest(last_seen_at,d.received_at),discovered_at=least(discovered_at,d.received_at) where id=target and owner_profile_id=profile;
 if reliable then insert into public.job_provider_identities values(profile,d.provider,d.external_id,target) on conflict do nothing; end if;
 update public.job_discoveries set job_id=target,deduplication_state=outcome,status='processed',processed_at=now() where id=d.id and profile_id=profile;
 return jsonb_build_object('jobId',target,'state',outcome);
end $$;
revoke all on function public.normalize_discovery(uuid,jsonb) from public,anon;
grant execute on function public.normalize_discovery(uuid,jsonb) to authenticated;
commit;

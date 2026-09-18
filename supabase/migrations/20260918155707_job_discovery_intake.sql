begin;
create unique index job_sources_profile_provider_key on public.job_sources(profile_id,provider);
alter table public.job_sources add constraint job_sources_id_profile_key unique(id,profile_id);
create table public.job_sync_runs (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
 source_id uuid not null, preference_id uuid, provider text not null,
 status text not null default 'running' check(status in ('running','completed','partial','failed')),
 started_at timestamptz not null default now(), finished_at timestamptz,
 received_count integer not null default 0 check(received_count>=0), rejected_count integer not null default 0 check(rejected_count>=0),
 error_code text, error_message text, pagination jsonb not null default '[]' check(jsonb_typeof(pagination)='array'),
 unique(id,profile_id),
 foreign key(source_id,profile_id) references public.job_sources(id,profile_id) on delete cascade,
 foreign key(preference_id,profile_id) references public.job_preferences(id,profile_id) on delete restrict
);
create unique index one_active_job_sync on public.job_sync_runs(profile_id,provider) where status='running';
create index job_sync_runs_source_idx on public.job_sync_runs(source_id,profile_id);
create index job_sync_runs_preference_idx on public.job_sync_runs(preference_id,profile_id);
create index job_sync_runs_history_idx on public.job_sync_runs(profile_id,started_at desc);
create table public.job_discoveries (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
 run_id uuid not null, provider text not null, external_id text not null,
 dto jsonb not null check(jsonb_typeof(dto)='object'), received_at timestamptz not null default now(),
 status text not null default 'pending_normalization' check(status='pending_normalization'),
 foreign key(run_id,profile_id) references public.job_sync_runs(id,profile_id) on delete cascade,
 unique(run_id,provider,external_id)
);
create index job_discoveries_owner_time_idx on public.job_discoveries(profile_id,received_at desc);
create index job_discoveries_run_idx on public.job_discoveries(run_id,profile_id);
alter table public.job_sync_runs enable row level security;
alter table public.job_discoveries enable row level security;
revoke all on public.job_sync_runs,public.job_discoveries from anon,authenticated;
grant select,insert,update,delete on public.job_sync_runs,public.job_discoveries to authenticated,service_role;
create policy owner_access on public.job_sync_runs for all to authenticated using(private.owns_profile(profile_id)) with check(private.owns_profile(profile_id));
create policy owner_access on public.job_discoveries for all to authenticated using(private.owns_profile(profile_id)) with check(private.owns_profile(profile_id));

-- A single shared credential is used across users and server processes. No secrets stored here.
create table private.adzuna_requests (requested_at timestamptz not null default clock_timestamp());
create index adzuna_requests_time_idx on private.adzuna_requests(requested_at);
create table private.adzuna_cooldown (id boolean primary key default true check(id), until_at timestamptz not null);
insert into private.adzuna_cooldown values (true,'-infinity');
alter table private.adzuna_requests enable row level security;
alter table private.adzuna_cooldown enable row level security;
revoke all on private.adzuna_requests,private.adzuna_cooldown from public,anon,authenticated;
-- Definer is narrowly necessary for an atomic global budget without exposing writable quota rows.
create function private.reserve_adzuna_request(delay_seconds integer default 0) returns boolean
language plpgsql security definer set search_path='' as $$
declare current_time_at timestamptz := clock_timestamp();
begin
 if auth.uid() is null or not exists(select 1 from public.candidate_profiles where user_id=auth.uid()) then raise exception 'Authentication required' using errcode='42501'; end if;
 if delay_seconds<0 or delay_seconds>31536000 then raise exception 'Invalid delay'; end if;
 perform pg_advisory_xact_lock(918273645);
 if delay_seconds>0 then
  update private.adzuna_cooldown set until_at=greatest(until_at,current_time_at+make_interval(secs=>delay_seconds));
  return false;
 end if;
 if (select until_at from private.adzuna_cooldown where id) > current_time_at then return false; end if;
 delete from private.adzuna_requests where requested_at < current_time_at-interval '31 days';
 if (select count(*) from private.adzuna_requests where requested_at>current_time_at-interval '1 minute')>=25
 or (select count(*) from private.adzuna_requests where requested_at>current_time_at-interval '1 day')>=250
 or (select count(*) from private.adzuna_requests where requested_at>current_time_at-interval '7 days')>=1000
 or (select count(*) from private.adzuna_requests)>=2500 then return false; end if;
 insert into private.adzuna_requests(requested_at) values(current_time_at);
 return true;
end $$;
revoke all on function private.reserve_adzuna_request(integer) from public,anon;
grant execute on function private.reserve_adzuna_request(integer) to authenticated;
create function public.reserve_adzuna_request(delay_seconds integer default 0) returns boolean
language sql security invoker set search_path='' as $$ select private.reserve_adzuna_request(delay_seconds); $$;
revoke all on function public.reserve_adzuna_request(integer) from public,anon;
grant execute on function public.reserve_adzuna_request(integer) to authenticated;
commit;

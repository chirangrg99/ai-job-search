-- Phase 2: normalized records, explicit API grants and ownership enforcement.
-- Shared catalogs contain public job/question content only; user-specific data belongs in profile-owned tables.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade unique,
 full_name text, preferred_name text, email text, phone text, city text, province text, country text,
 linkedin_url text, portfolio_url text, github_url text, professional_summary text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_facts (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, fact_type text not null check (length(trim(fact_type)) > 0), title text, description text,
 value_text text, value_number numeric, categories text[] not null default '{}', keywords text[] not null default '{}', verified boolean not null default false,
 sensitivity text not null default 'private' check (sensitivity in ('public','private','sensitive')),
 valid_from date, valid_to date, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), check (valid_to >= valid_from), check(jsonb_typeof(metadata) = 'object')
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, company text not null, title text not null, location text, start_date date, end_date date,
 currently_employed boolean not null default false, employment_type text, categories text[] not null default '{}', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
 check(end_date >= start_date), check(not currently_employed or end_date is null)
);

create table public.experience_bullets (
  id uuid primary key default gen_random_uuid(), experience_id uuid not null references public.experiences(id) on delete cascade,
 original_text text not null, skills text[] not null default '{}', keywords text[] not null default '{}', verified boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.education (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, institution text not null, credential text, field_of_study text, location text,
 start_date date, end_date date, verified boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), check(end_date >= start_date)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, name text not null, description text, technologies text[] not null default '{}', achievements text[] not null default '{}', url text,
 categories text[] not null default '{}', verified boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_sources (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, provider text not null, display_name text not null, enabled boolean not null default false,
 configuration jsonb not null default '{}'::jsonb, last_synced_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), check(jsonb_typeof(configuration) = 'object')
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(), provider text not null check(length(trim(provider)) > 0), external_job_id text check(length(trim(external_job_id)) > 0),
 company text, normalized_company text, title text not null, normalized_title text, location text, normalized_location text,
 country text, description text, application_url text, canonical_url text, salary_min numeric check(salary_min >= 0),
 salary_max numeric check(salary_max >= 0), salary_currency text, employment_type text, remote_type text,
 posted_at timestamptz, discovered_at timestamptz not null default now(), fingerprint text, source_metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
 check(salary_max >= salary_min), check(jsonb_typeof(source_metadata) = 'object')
);

create table public.job_preferences (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, name text not null, enabled boolean not null default true,
 target_titles text[] not null default '{}', excluded_titles text[] not null default '{}', keywords text[] not null default '{}', excluded_keywords text[] not null default '{}', target_locations text[] not null default '{}',
 remote_preferences text[] not null default '{}', employment_types text[] not null default '{}', min_salary numeric check(min_salary >= 0),
 salary_period text check(salary_period in ('hour','day','week','month','year')), max_commute_km numeric check(max_commute_km >= 0),
 minimum_fit_score numeric check(minimum_fit_score between 0 and 100), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
 unique(id, profile_id), check(jsonb_typeof(metadata) = 'object')
);

create table public.job_analysis (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete restrict, profile_id uuid not null references public.candidate_profiles(id) on delete cascade, preference_id uuid,
 fit_score numeric check(fit_score between 0 and 100), recommendation text,
 matched_requirements jsonb not null default '[]', partial_requirements jsonb not null default '[]',
 missing_required_requirements jsonb not null default '[]', missing_preferred_requirements jsonb not null default '[]',
 strengths jsonb not null default '[]', concerns jsonb not null default '[]', reasoning_summary text,
 model text not null, prompt_version text not null, analyzed_at timestamptz not null default now(), created_at timestamptz not null default now(),
 foreign key(preference_id, profile_id) references public.job_preferences(id, profile_id) on delete restrict,
 unique nulls not distinct(job_id, profile_id, preference_id, model, prompt_version)
);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, job_id uuid not null references public.jobs(id) on delete restrict,
 structured_content jsonb not null default '{}'::jsonb, validation_result jsonb not null default '{}'::jsonb, model text not null, prompt_version text not null,
 pdf_storage_path text, created_at timestamptz not null default now(), unique(id, profile_id, job_id),
 check(jsonb_typeof(structured_content) = 'object'), check(jsonb_typeof(validation_result) = 'object')
);

create table public.application_questions (
  id uuid primary key default gen_random_uuid(), canonical_key text unique, normalized_question text not null,
 question_type text not null check(question_type in ('text','boolean','number','single_select','multi_select')),
 category text, sensitive boolean not null default true, requires_confirmation boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_answers (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, question_id uuid references public.application_questions(id) on delete set null,
 canonical_key text, question_pattern text, answer_text text, answer_boolean boolean, answer_number numeric,
 verified boolean not null default false, safe_to_reuse boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
 check(num_nonnulls(answer_text, answer_boolean, answer_number) <= 1), check(not safe_to_reuse or verified)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.candidate_profiles(id) on delete cascade, job_id uuid not null references public.jobs(id) on delete restrict,
 status text not null default 'interested' check(status in ('interested','preparing','ready_to_apply','applied','interview','offer','rejected','withdrawn','archived')),
 resume_version_id uuid, cover_letter text, started_at timestamptz, submitted_at timestamptz,
 application_confirmation text, notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(profile_id, job_id),
 foreign key(resume_version_id, profile_id, job_id) references public.resume_versions(id, profile_id, job_id) on delete restrict
);

create table public.application_responses (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
 question_text text not null, normalized_question text, answer_text text, source text,
 confidence numeric check(confidence between 0 and 1),
 provenance text not null default 'NEEDS_INPUT' check(provenance in ('VERIFIED','AI_DRAFT','NEEDS_INPUT','UNSUPPORTED')),
 requires_review boolean not null default true, reviewed boolean not null default false, created_at timestamptz not null default now()
);

-- Provider identifiers are strong; URLs/fingerprints are lookup signals, never automatic merges.
create unique index jobs_provider_external_id_key on public.jobs(provider, external_job_id) where external_job_id is not null;
create index jobs_canonical_url_idx on public.jobs(canonical_url) where canonical_url is not null;
create index jobs_fingerprint_idx on public.jobs(fingerprint) where fingerprint is not null;
create index jobs_discovered_at_idx on public.jobs(discovered_at desc);
create unique index candidate_answers_canonical_key on public.candidate_answers(profile_id, canonical_key) where canonical_key is not null;

create function private.owns_profile(target_profile_id uuid) returns boolean
language sql stable security invoker set search_path = ''
as $$ select exists(select 1 from public.candidate_profiles where id = target_profile_id and user_id = (select auth.uid())); $$;
revoke all on function private.owns_profile(uuid) from public;
grant execute on function private.owns_profile(uuid) to authenticated;

create function private.set_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
revoke all on function private.set_updated_at() from public;

alter table public.candidate_profiles enable row level security;
revoke all on public.candidate_profiles from anon, authenticated;
grant select, insert, update, delete on public.candidate_profiles to service_role;
grant select, insert, update, delete on public.candidate_profiles to authenticated;
create policy owner_access on public.candidate_profiles for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger set_updated_at before update on public.candidate_profiles for each row execute function private.set_updated_at();

alter table public.candidate_facts enable row level security;
revoke all on public.candidate_facts from anon, authenticated;
grant select, insert, update, delete on public.candidate_facts to service_role;
grant select, insert, update, delete on public.candidate_facts to authenticated;
create policy owner_access on public.candidate_facts for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.candidate_facts for each row execute function private.set_updated_at();
create index candidate_facts_profile_id_idx on public.candidate_facts(profile_id);

alter table public.experiences enable row level security;
revoke all on public.experiences from anon, authenticated;
grant select, insert, update, delete on public.experiences to service_role;
grant select, insert, update, delete on public.experiences to authenticated;
create policy owner_access on public.experiences for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.experiences for each row execute function private.set_updated_at();
create index experiences_profile_id_idx on public.experiences(profile_id);

alter table public.experience_bullets enable row level security;
revoke all on public.experience_bullets from anon, authenticated;
grant select, insert, update, delete on public.experience_bullets to service_role;
grant select, insert, update, delete on public.experience_bullets to authenticated;
create policy owner_access on public.experience_bullets for all to authenticated using (exists(select 1 from public.experiences e where e.id = experience_id and private.owns_profile(e.profile_id))) with check (exists(select 1 from public.experiences e where e.id = experience_id and private.owns_profile(e.profile_id)));
create trigger set_updated_at before update on public.experience_bullets for each row execute function private.set_updated_at();

alter table public.education enable row level security;
revoke all on public.education from anon, authenticated;
grant select, insert, update, delete on public.education to service_role;
grant select, insert, update, delete on public.education to authenticated;
create policy owner_access on public.education for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.education for each row execute function private.set_updated_at();
create index education_profile_id_idx on public.education(profile_id);

alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to service_role;
grant select, insert, update, delete on public.projects to authenticated;
create policy owner_access on public.projects for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.projects for each row execute function private.set_updated_at();
create index projects_profile_id_idx on public.projects(profile_id);

alter table public.job_sources enable row level security;
revoke all on public.job_sources from anon, authenticated;
grant select, insert, update, delete on public.job_sources to service_role;
grant select, insert, update, delete on public.job_sources to authenticated;
create policy owner_access on public.job_sources for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.job_sources for each row execute function private.set_updated_at();
create index job_sources_profile_id_idx on public.job_sources(profile_id);

alter table public.jobs enable row level security;
revoke all on public.jobs from anon, authenticated;
grant select, insert, update, delete on public.jobs to service_role;
grant select on public.jobs to authenticated;
create policy catalog_read on public.jobs for select to authenticated using ((select auth.uid()) is not null);
create trigger set_updated_at before update on public.jobs for each row execute function private.set_updated_at();

alter table public.job_preferences enable row level security;
revoke all on public.job_preferences from anon, authenticated;
grant select, insert, update, delete on public.job_preferences to service_role;
grant select, insert, update, delete on public.job_preferences to authenticated;
create policy owner_access on public.job_preferences for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.job_preferences for each row execute function private.set_updated_at();
create index job_preferences_profile_id_idx on public.job_preferences(profile_id);

alter table public.job_analysis enable row level security;
revoke all on public.job_analysis from anon, authenticated;
grant select, insert, update, delete on public.job_analysis to service_role;
grant select, insert, update, delete on public.job_analysis to authenticated;
create policy owner_access on public.job_analysis for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create index job_analysis_profile_id_idx on public.job_analysis(profile_id);

alter table public.resume_versions enable row level security;
revoke all on public.resume_versions from anon, authenticated;
grant select, insert, update, delete on public.resume_versions to service_role;
grant select, insert, update, delete on public.resume_versions to authenticated;
create policy owner_access on public.resume_versions for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create index resume_versions_profile_id_idx on public.resume_versions(profile_id);

alter table public.application_questions enable row level security;
revoke all on public.application_questions from anon, authenticated;
grant select, insert, update, delete on public.application_questions to service_role;
grant select on public.application_questions to authenticated;
create policy catalog_read on public.application_questions for select to authenticated using ((select auth.uid()) is not null);
create trigger set_updated_at before update on public.application_questions for each row execute function private.set_updated_at();

alter table public.candidate_answers enable row level security;
revoke all on public.candidate_answers from anon, authenticated;
grant select, insert, update, delete on public.candidate_answers to service_role;
grant select, insert, update, delete on public.candidate_answers to authenticated;
create policy owner_access on public.candidate_answers for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.candidate_answers for each row execute function private.set_updated_at();

alter table public.applications enable row level security;
revoke all on public.applications from anon, authenticated;
grant select, insert, update, delete on public.applications to service_role;
grant select, insert, update, delete on public.applications to authenticated;
create policy owner_access on public.applications for all to authenticated using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));
create trigger set_updated_at before update on public.applications for each row execute function private.set_updated_at();

alter table public.application_responses enable row level security;
revoke all on public.application_responses from anon, authenticated;
grant select, insert, update, delete on public.application_responses to service_role;
grant select, insert, update, delete on public.application_responses to authenticated;
create policy owner_access on public.application_responses for all to authenticated using (exists(select 1 from public.applications a where a.id = application_id and private.owns_profile(a.profile_id))) with check (exists(select 1 from public.applications a where a.id = application_id and private.owns_profile(a.profile_id)));

create index experience_bullets_experience_id_idx on public.experience_bullets(experience_id);
create index job_analysis_job_id_idx on public.job_analysis(job_id);
create index job_analysis_preference_id_idx on public.job_analysis(preference_id);
create index resume_versions_job_id_idx on public.resume_versions(job_id);
create index candidate_answers_question_id_idx on public.candidate_answers(question_id);
create index applications_job_id_idx on public.applications(job_id);
create index applications_resume_version_id_idx on public.applications(resume_version_id);
create index application_responses_application_id_idx on public.application_responses(application_id);

create index candidate_answers_profile_id_idx on public.candidate_answers(profile_id);
alter table public.job_analysis add constraint requirement_arrays check (
 jsonb_typeof(matched_requirements) = 'array' and jsonb_typeof(partial_requirements) = 'array' and
 jsonb_typeof(missing_required_requirements) = 'array' and jsonb_typeof(missing_preferred_requirements) = 'array' and
 jsonb_typeof(strengths) = 'array' and jsonb_typeof(concerns) = 'array');

comment on column public.job_sources.configuration is 'Non-secret provider/search options only. Never store provider API keys here.';
comment on column public.jobs.source_metadata is 'Shared public listing metadata only; exclude candidate identifiers and credentials.';
comment on table public.application_questions is 'Shared canonical prompts only; personal question text belongs in application_responses.';
comment on column public.candidate_facts.metadata is 'Flexible source/precision references; source verification must remain explicit.';
commit;

begin;
-- Cover every column of composite foreign keys; replace redundant single-column indexes.
drop index public.applications_resume_version_id_idx;
create index applications_resume_relationship_idx on public.applications(resume_version_id, profile_id, job_id);
drop index public.job_analysis_preference_id_idx;
create index job_analysis_preference_relationship_idx on public.job_analysis(preference_id, profile_id);
commit;

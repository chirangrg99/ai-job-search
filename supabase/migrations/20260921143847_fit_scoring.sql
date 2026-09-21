begin;
alter table public.job_analysis
 add column input_hash text,
 add column engine_version text,
 add column input_snapshot jsonb,
 add column result jsonb,
 add column semantic_output jsonb,
 add constraint fit_complete_record check(engine_version is null or (input_hash is not null and input_snapshot is not null and result is not null and fit_score is not null and recommendation is not null and result ?& array['fitScore','engineVersion','recommendation'])),
 add constraint fit_input_hash check(input_hash is null or input_hash ~ '^[a-f0-9]{64}$'),
 add constraint fit_snapshot_object check(input_snapshot is null or jsonb_typeof(input_snapshot)='object'),
 add constraint fit_result_object check(result is null or (jsonb_typeof(result)='object' and result->>'engineVersion'=engine_version and (result->>'fitScore')::numeric=fit_score and result->>'recommendation'=recommendation)),
 add constraint fit_recommendation check(engine_version is null or recommendation in ('strong_apply','apply','maybe','skip'));
-- Replace the old logical-version uniqueness with immutable input-version history.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.job_analysis'::regclass and contype='u' loop
  execute format('alter table public.job_analysis drop constraint %I',c.conname);
 end loop;
end $$;
create unique index job_analysis_input_key on public.job_analysis(job_id,profile_id,preference_id,model,prompt_version,engine_version,input_hash) nulls not distinct;
drop policy owner_access on public.job_analysis;
create policy owner_access on public.job_analysis for all to authenticated
 using(private.owns_profile(profile_id) and exists(select 1 from public.jobs j where j.id=job_id and (j.owner_profile_id is null or j.owner_profile_id=profile_id)))
 with check(private.owns_profile(profile_id) and exists(select 1 from public.jobs j where j.id=job_id and (j.owner_profile_id is null or j.owner_profile_id=profile_id)));
comment on column public.job_analysis.input_snapshot is 'Reproducible verified evidence, parsed requirements, preferences and evaluation date; never a full candidate profile.';
commit;

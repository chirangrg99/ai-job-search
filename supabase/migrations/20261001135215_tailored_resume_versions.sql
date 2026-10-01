begin;
-- Preserve resume history: candidate sessions may insert and read, never rewrite/delete versions.
revoke update, delete on public.resume_versions from authenticated;
drop policy owner_access on public.resume_versions;
create policy owner_read on public.resume_versions for select to authenticated using(private.owns_profile(profile_id));
create policy owner_insert on public.resume_versions for insert to authenticated with check (
 private.owns_profile(profile_id) and exists(select 1 from public.jobs j where j.id=job_id and j.owner_profile_id=profile_id)
);
create index resume_versions_history_idx on public.resume_versions(profile_id,job_id,created_at desc,id desc);
alter table public.applications add column resume_generation_token uuid, add column resume_generation_started_at timestamptz;

create function public.claim_resume_generation(target_application uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare token uuid := gen_random_uuid();
begin
 update public.applications a set resume_generation_token=token,resume_generation_started_at=now()
 where a.id=target_application and private.owns_profile(a.profile_id)
 and (a.resume_generation_started_at is null or a.resume_generation_started_at < now()-interval '3 minutes');
 if not found then return null; end if;
 return token;
end $$;
create function public.release_resume_generation(target_application uuid,lease_token uuid) returns void
language sql security invoker set search_path = '' as $$
 update public.applications a set resume_generation_token=null,resume_generation_started_at=null
 where a.id=target_application and private.owns_profile(a.profile_id) and a.resume_generation_token=lease_token;
$$;
create function public.save_resume_generation(target_application uuid,lease_token uuid,content jsonb,validation jsonb,response_model text,prompt text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare app public.applications; result_id uuid;
begin
 select * into app from public.applications a where a.id=target_application and private.owns_profile(a.profile_id) for update;
 if not found or app.resume_generation_token is distinct from lease_token or lease_token is null
 or app.resume_generation_started_at < now()-interval '3 minutes' then raise exception 'Generation lease unavailable'; end if;
 if content->>'version' is distinct from 'resume-v1' or jsonb_typeof(content->'draft') is distinct from 'object'
 or jsonb_typeof(content->'context'->'items') is distinct from 'array'
 or validation->>'version' is distinct from 'resume-validation-v1'
 or jsonb_typeof(validation->'passed') is distinct from 'boolean'
 or jsonb_typeof(validation->'issues') is distinct from 'array'
 or jsonb_typeof(validation->'unsupportedClaims') is distinct from 'array'
 or jsonb_typeof(validation->'warnings') is distinct from 'array'
 or (validation->>'passed'='true' and (jsonb_array_length(validation->'issues')<>0 or jsonb_array_length(validation->'unsupportedClaims')<>0))
 then raise exception 'Invalid resume version'; end if;
 insert into public.resume_versions(profile_id,job_id,structured_content,validation_result,model,prompt_version)
 values(app.profile_id,app.job_id,content,validation,response_model,prompt) returning id into result_id;
 -- Passing resume validation alone cannot advance application readiness.
 update public.applications set resume_generation_token=null,resume_generation_started_at=null where id=app.id;
 return result_id;
end $$;
revoke all on function public.claim_resume_generation(uuid),public.release_resume_generation(uuid,uuid),public.save_resume_generation(uuid,uuid,jsonb,jsonb,text,text) from public,anon;
grant execute on function public.claim_resume_generation(uuid),public.release_resume_generation(uuid,uuid),public.save_resume_generation(uuid,uuid,jsonb,jsonb,text,text) to authenticated;
commit;

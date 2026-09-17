begin;
-- Synthetic identities, rolled back at the end. No real candidate data.
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');
insert into public.candidate_profiles(id,user_id) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');
insert into public.jobs(id,provider,title,external_job_id) values
 ('30000000-0000-4000-8000-000000000001','test','Synthetic test listing','test-one'),
 ('30000000-0000-4000-8000-000000000002','test','Second synthetic listing','test-two');
insert into public.experiences(id,profile_id,company,title) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Test','Test'),
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Test','Test');
insert into public.experience_bullets(experience_id,original_text) select id,'Synthetic test' from public.experiences where id::text like '40000000%';
insert into public.job_preferences(id,profile_id,name) values
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Test'),
 ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Test');
insert into public.resume_versions(id,profile_id,job_id,model,prompt_version) values
 ('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','test','1'),
 ('60000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','test','1');
insert into public.applications(id,profile_id,job_id) values
 ('70000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),
 ('70000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001');
insert into public.application_responses(application_id,question_text) select id,'Synthetic question' from public.applications where id::text like '70000000%';

insert into public.candidate_facts(profile_id,fact_type) select id,'skill' from public.candidate_profiles where id::text like '20000000%';
insert into public.education(profile_id,institution) select id,'Synthetic institution' from public.candidate_profiles where id::text like '20000000%';
insert into public.projects(profile_id,name) select id,'Synthetic project' from public.candidate_profiles where id::text like '20000000%';
insert into public.job_sources(profile_id,provider,display_name) select id,'test','Synthetic source' from public.candidate_profiles where id::text like '20000000%';
insert into public.candidate_answers(profile_id,question_pattern) select id,'Synthetic prompt' from public.candidate_profiles where id::text like '20000000%';

do $$ begin
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('candidate_profiles','candidate_facts','experiences','experience_bullets','education','projects','job_sources','jobs','job_preferences','job_analysis','resume_versions','application_questions','candidate_answers','applications','application_responses') and c.relrowsecurity) <> 15 then raise exception 'RLS missing'; end if;
 begin insert into public.candidate_profiles(user_id) values ('10000000-0000-4000-8000-000000000001'); raise exception 'duplicate profile accepted'; exception when unique_violation then null; end;
 begin insert into public.jobs(provider,title,external_job_id) values ('test','Duplicate','test-one'); raise exception 'duplicate provider ID accepted'; exception when unique_violation then null; end;
 -- Uncertain fingerprint matches must remain separate.
 insert into public.jobs(provider,title,fingerprint) values ('test','Uncertain one','same'),('test','Uncertain two','same');
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
do $$ declare affected int; table_name text; visible_count int; begin
 foreach table_name in array array['candidate_facts','experiences','education','projects','job_sources','job_preferences','resume_versions','candidate_answers'] loop
  execute format('select count(*) from public.%I', table_name) into visible_count;
  if visible_count <> 1 then raise exception 'ownership read failed: %', table_name; end if;
  begin
   execute format('update public.%I set profile_id = %L',table_name,'20000000-0000-4000-8000-000000000002');
   raise exception 'cross-owner move accepted: %',table_name;
  exception when insufficient_privilege then null; end;
 end loop;
 if not private.owns_profile('20000000-0000-4000-8000-000000000001') or private.owns_profile('20000000-0000-4000-8000-000000000002') then raise exception 'ownership helper broken'; end if;
 if (select count(*) from public.candidate_profiles) <> 1 then raise exception 'profile isolation broken'; end if;
 if (select count(*) from public.applications) <> 1 then raise exception 'application isolation broken'; end if;
 if (select count(*) from public.experience_bullets) <> 1 then raise exception 'nested experience isolation broken'; end if;
 if (select count(*) from public.application_responses) <> 1 then raise exception 'nested response isolation broken'; end if;
 update public.candidate_profiles set full_name='Forbidden' where id='20000000-0000-4000-8000-000000000002'; get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'cross-owner update accepted'; end if;
 delete from public.applications where id='70000000-0000-4000-8000-000000000002'; get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'cross-owner delete accepted'; end if;
 begin update public.candidate_profiles set user_id='10000000-0000-4000-8000-000000000002'; raise exception 'owner reassignment accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.candidate_facts(profile_id,fact_type) values ('20000000-0000-4000-8000-000000000002','skill'); raise exception 'cross-owner insert accepted'; exception when insufficient_privilege then null; end;
 begin update public.experience_bullets set experience_id='40000000-0000-4000-8000-000000000002'; raise exception 'nested reassignment accepted'; exception when insufficient_privilege then null; end;
 begin update public.application_responses set application_id='70000000-0000-4000-8000-000000000002'; raise exception 'response reassignment accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.applications(profile_id,job_id) values ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'); raise exception 'duplicate application accepted'; exception when unique_violation then null; end;
 begin update public.applications set status='automatically_submitted'; raise exception 'invalid status accepted'; exception when check_violation then null; end;
 begin update public.applications set resume_version_id='60000000-0000-4000-8000-000000000002'; raise exception 'foreign resume accepted'; exception when foreign_key_violation then null; end;
 begin insert into public.job_analysis(job_id,profile_id,preference_id,model,prompt_version) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','test','1'); raise exception 'foreign preference accepted'; exception when foreign_key_violation then null; end;
 begin insert into public.job_analysis(job_id,profile_id,fit_score,model,prompt_version) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',101,'test','1'); raise exception 'invalid fit accepted'; exception when check_violation then null; end;
 insert into public.job_analysis(job_id,profile_id,model,prompt_version) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','test','1');
 begin insert into public.job_analysis(job_id,profile_id,model,prompt_version) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','test','1'); raise exception 'duplicate null-preference analysis accepted'; exception when unique_violation then null; end;
 begin update public.application_responses set provenance='INVENTED'; raise exception 'invalid provenance accepted'; exception when check_violation then null; end;
 begin update public.application_responses set confidence=2; raise exception 'invalid confidence accepted'; exception when check_violation then null; end;
 begin insert into public.jobs(provider,title) values ('test','Forbidden'); raise exception 'catalog write accepted'; exception when insufficient_privilege then null; end;
 update public.applications set status='preparing',resume_version_id='60000000-0000-4000-8000-000000000001' where id='70000000-0000-4000-8000-000000000001';
 insert into public.candidate_facts(profile_id,fact_type) values ('20000000-0000-4000-8000-000000000001','skill');
 if (select verified from public.candidate_facts limit 1) then raise exception 'new fact implicitly verified'; end if;
end $$;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
do $$ begin
 if (select count(*) from public.applications) <> 1 or (select status from public.applications) <> 'interested' then raise exception 'second user isolation failed'; end if;
 if (select count(*) from public.candidate_facts) <> 1 then raise exception 'second user sees first facts'; end if;
end $$;
-- Account/profile deletion must cascade without leaving candidate records behind.
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
delete from public.candidate_profiles where id='20000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.applications) or exists(select 1 from public.resume_versions) then raise exception 'profile cascade failed'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.candidate_profiles; raise exception 'anonymous profile access accepted'; exception when insufficient_privilege then null; end;
 begin perform * from public.jobs; raise exception 'anonymous catalog access accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;

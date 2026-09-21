begin;
insert into auth.users(id) values('91000000-0000-4000-8000-000000000001'),('91000000-0000-4000-8000-000000000002');
insert into public.candidate_profiles(id,user_id) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001'),('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002');
insert into public.jobs(id,owner_profile_id,provider,title) values('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','manual','Fit test'),('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','manual','Foreign fit test');
insert into public.job_preferences(id,profile_id,name) values('94000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','Foreign');
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000001';
insert into public.job_analysis(job_id,profile_id,model,prompt_version,engine_version,input_hash,input_snapshot,result,fit_score,recommendation)
values('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','deterministic','fit-v1','fit-v1',repeat('a',64),'{}','{"fitScore":80,"recommendation":"strong_apply","engineVersion":"fit-v1"}',80,'strong_apply');
do $$ begin
 begin
  insert into public.job_analysis(job_id,profile_id,model,prompt_version,engine_version,input_hash,input_snapshot,result,fit_score,recommendation)
  select job_id,profile_id,model,prompt_version,engine_version,input_hash,input_snapshot,result,fit_score,recommendation from public.job_analysis where input_hash=repeat('a',64);
  raise exception 'Duplicate input accepted';
 exception when unique_violation then null; end;
 begin update public.job_analysis set fit_score=101; raise exception 'Invalid score accepted'; exception when check_violation then null; end;
 begin update public.job_analysis set result='{}'; raise exception 'Incomplete result accepted'; exception when check_violation then null; end;
 begin update public.job_analysis set recommendation='invented'; raise exception 'Invalid recommendation accepted'; exception when check_violation then null; end;
 begin update public.job_analysis set preference_id='94000000-0000-4000-8000-000000000002'; raise exception 'Foreign preference accepted'; exception when foreign_key_violation then null; end;
 begin update public.job_analysis set job_id='93000000-0000-4000-8000-000000000002'; raise exception 'Foreign job accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.job_analysis(job_id,profile_id,model,prompt_version) values('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','x','x'); raise exception 'Foreign job insert accepted'; exception when insufficient_privilege then null; end;
end $$;
-- Different source versions preserve distinct history.
insert into public.job_analysis(job_id,profile_id,model,prompt_version,engine_version,input_hash,input_snapshot,result,fit_score,recommendation)
select job_id,profile_id,model,prompt_version,engine_version,repeat('b',64),input_snapshot,result,fit_score,recommendation from public.job_analysis where input_hash=repeat('a',64);
do $$ begin if (select count(*) from public.job_analysis)<>2 then raise exception 'History missing'; end if; end $$;
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000002';
do $$ declare n integer; begin
 if exists(select 1 from public.job_analysis) then raise exception 'Foreign score visible'; end if;
 update public.job_analysis set reasoning_summary='tampered'; get diagnostics n=row_count; if n<>0 then raise exception 'Foreign score mutable'; end if;
 delete from public.job_analysis; get diagnostics n=row_count; if n<>0 then raise exception 'Foreign score deletable'; end if;
end $$;
set local role anon;
do $$ begin begin perform * from public.job_analysis; raise exception 'Anon score access'; exception when insufficient_privilege then null; end; end $$;
rollback;

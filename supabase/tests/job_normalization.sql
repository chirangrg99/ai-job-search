begin;
insert into auth.users(id) values('71000000-0000-4000-8000-000000000001'),('71000000-0000-4000-8000-000000000002');
insert into public.candidate_profiles(id,user_id) values('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001'),('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002');
set local role authenticated;
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
do $$
declare p uuid := '72000000-0000-4000-8000-000000000001'; s uuid:=gen_random_uuid(); r uuid; d uuid; original_job uuid; answer jsonb; raw jsonb; n jsonb; i integer;
begin
 insert into public.job_sources(id,profile_id,provider,display_name) values(s,p,'adzuna','Synthetic test');
 for i in 1..3 loop
  r:=gen_random_uuid();d:=gen_random_uuid();
  raw:=jsonb_build_object('provider','adzuna','externalId','synthetic-123','title','Engineer','company','Synthetic Company','location','Toronto','country','CA','description','Synthetic description','descriptionComplete',false,'salaryMin',case when i=3 then 60000 else 50000 end,'salaryMax',70000,'salaryCurrency','CAD','salaryPeriod','year','employmentType','full_time');
  n:=jsonb_build_object('version','v1','raw',raw,'company','synthetic company','title','engineer','location','toronto','reliableId',true,'strongContent',false,'postingUrl',false,'fingerprint','v1:'||repeat('a',64),'signature',repeat(case when i=3 then 'b' else 'a' end,64),'salary',jsonb_build_object('min',case when i=3 then 60000 else 50000 end,'max',70000,'currency','CAD','period','year'),'employmentType','full_time');
  insert into public.job_sync_runs(id,profile_id,source_id,provider,status) values(r,p,s,'adzuna','completed');
  insert into public.job_discoveries(id,profile_id,run_id,provider,external_id,dto,received_at) values(d,p,r,'adzuna','synthetic-123',raw,'2026-09-01'::timestamptz+make_interval(days=>i));
  answer:=public.normalize_discovery(d,n);
  if i=1 then original_job:=(answer->>'jobId')::uuid; end if;
  if (answer->>'jobId')::uuid<>original_job or answer->>'state' <> (case i when 1 then 'new' when 2 then 'exact_duplicate' else 'updated_existing' end) then raise exception 'deduplication outcome mismatch'; end if;
  if public.normalize_discovery(d,n)<>answer then raise exception 'reprocessing not idempotent'; end if;
 end loop;
 if (select count(*) from public.jobs where owner_profile_id=p)<>1 then raise exception 'duplicate job created'; end if;
 if not exists(select 1 from public.jobs where id=original_job and salary_min=60000 and discovered_at='2026-09-02'::timestamptz) then raise exception 'update or first discovery failed'; end if;
 perform set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
 if exists(select 1 from public.jobs where owner_profile_id=p) then raise exception 'foreign job visible'; end if;
 begin perform public.normalize_discovery(d,n); raise exception 'foreign discovery accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;

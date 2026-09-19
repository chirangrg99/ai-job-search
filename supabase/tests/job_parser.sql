begin;
insert into auth.users(id) values('91000000-0000-4000-8000-000000000001'),('91000000-0000-4000-8000-000000000002');
insert into public.candidate_profiles(id,user_id) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001'),('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002');
insert into public.jobs(id,owner_profile_id,provider,title,description,normalized_data) values('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','manual','Example job','Example job','{"raw":{"descriptionComplete":true}}');
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000001';
do $$
declare r jsonb; payload jsonb; j uuid:='93000000-0000-4000-8000-000000000001';
begin
 r:=public.claim_job_parse(j,repeat('a',64),'Example job',true,'test','v1','1');
 if r->>'state'<>'claimed' then raise exception 'claim failed'; end if;
 if public.claim_job_parse(j,repeat('a',64),'Example job',true,'test','v1','1')->>'state'<>'busy' then raise exception 'double claim'; end if;
 begin
  update public.job_description_parses set status='completed',parsed_output='{}',analyzed_at=now(),response_model='test' where id=(r->>'id')::uuid;
  raise exception 'malformed output accepted';
 exception when check_violation then null; end;
 payload:='{"title":{"text":"Example job","evidence":"Example job"},"company":null,"location":null,"employmentType":null,"salary":null,"responsibilities":[],"requiredQualifications":[],"preferredQualifications":[],"skills":[],"technologies":[],"licences":[],"certifications":[],"educationRequirements":[],"experienceRequirements":[],"physicalRequirements":[],"scheduleRequirements":[],"workAuthorizationWording":null,"ambiguities":[]}';
 update public.job_description_parses set status='completed',parsed_output=payload,analyzed_at=now(),response_model='test' where id=(r->>'id')::uuid;
 if public.claim_job_parse(j,repeat('a',64),'Example job',true,'test','v1','1')->>'state'<>'cached' then raise exception 'cache failed'; end if;
 perform set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
 if exists(select 1 from public.job_description_parses where job_id=j) then raise exception 'foreign parse visible'; end if;
 begin
  perform public.claim_job_parse(j,repeat('a',64),'Example job',true,'test','v1','1');
  raise exception 'foreign claim accepted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;

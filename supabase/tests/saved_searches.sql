begin;
insert into auth.users(id) values ('12000000-0000-4000-8000-000000000001'), ('12000000-0000-4000-8000-000000000002');
insert into public.candidate_profiles(id,user_id) values
 ('22000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001'),
 ('22000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000002');
insert into public.job_preferences(id,profile_id,name) values ('52000000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000002','Other user');
set local role authenticated;
select set_config('request.jwt.claim.sub','12000000-0000-4000-8000-000000000001',true);
insert into public.job_preferences(id,profile_id,name,target_titles,target_locations,keywords,min_salary,salary_currency,salary_period,max_commute_km,minimum_fit_score)
values ('52000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','First',array['Developer','Technician'],array['Toronto, ON'],array['SQL'],50,'CAD','hour',30,70);
insert into public.job_preferences(profile_id,name,target_titles,target_locations,keywords,min_salary,salary_currency,salary_period,max_commute_km,minimum_fit_score,enabled)
select profile_id,'First (copy)',target_titles,target_locations,keywords,min_salary,salary_currency,salary_period,max_commute_km,minimum_fit_score,false from public.job_preferences where name='First';
do $$ begin
 if (select count(*) from public.job_preferences) <> 2 then raise exception 'Multiple independent searches or RLS failed'; end if;
 if (select count(distinct profile_id) from public.job_preferences) <> 1 then raise exception 'Searches duplicated profile'; end if;
 if not exists(select 1 from public.job_preferences where name='First (copy)' and not enabled and salary_currency='CAD' and keywords=array['SQL']) then raise exception 'Copy data lost'; end if;
 update public.job_preferences set name='Edited',enabled=false where name='First';
 if not exists(select 1 from public.job_preferences where name='Edited' and not enabled) then raise exception 'Edit/pause failed'; end if;
 update public.job_preferences set enabled=true where name='Edited';
 if not exists(select 1 from public.job_preferences where name='Edited' and enabled) then raise exception 'Enable failed'; end if;
 update public.job_preferences set name='Attacked' where id='52000000-0000-4000-8000-000000000002';
 if found then raise exception 'Foreign update allowed'; end if;
 delete from public.job_preferences where id='52000000-0000-4000-8000-000000000002';
 if found then raise exception 'Foreign delete allowed'; end if;
 begin
 insert into public.job_preferences(profile_id,name) values ('22000000-0000-4000-8000-000000000002','Bad');
 raise exception 'Foreign insert allowed';
 exception when insufficient_privilege then null; end;
 begin
 update public.job_preferences set profile_id='22000000-0000-4000-8000-000000000002' where name='Edited';
 raise exception 'Foreign reassignment allowed';
 exception when insufficient_privilege then null; end;
 begin
 update public.job_preferences set salary_currency='dollars' where name='Edited';
 raise exception 'Invalid currency accepted';
 exception when check_violation then null; end;
 delete from public.job_preferences where name='First (copy)';
 if (select count(*) from public.job_preferences) <> 1 then raise exception 'Independent deletion failed'; end if;
end $$;
reset role;
rollback;

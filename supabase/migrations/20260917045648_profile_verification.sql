begin;
alter table public.candidate_profiles
 add column personal_verified boolean not null default false,
 add column summary_verified boolean not null default false,
 add column personal_verified_at timestamptz,
 add column summary_verified_at timestamptz,
 add column personal_source_reference text,
 add column summary_source_reference text,
 add column revision integer not null default 1;
alter table public.experiences add column verified boolean not null default false;
alter table public.education add column categories text[] not null default '{}';
alter table public.experience_bullets add column categories text[] not null default '{}';
do $$ declare t text; begin
 foreach t in array array['candidate_facts','experiences','experience_bullets','education','projects'] loop
  execute format('alter table public.%I add column verified_at timestamptz, add column source_reference text, add column revision integer not null default 1',t);
 end loop;
 foreach t in array array['experiences','education'] loop
  execute format('alter table public.%I add column start_date_precision text not null default ''day'' check(start_date_precision in (''year'',''month'',''day'')), add column end_date_precision text not null default ''day'' check(end_date_precision in (''year'',''month'',''day''))',t);
 end loop;
end $$;
alter table public.candidate_facts add column valid_from_precision text not null default 'day' check(valid_from_precision in ('year','month','day')),
 add column valid_to_precision text not null default 'day' check(valid_to_precision in ('year','month','day'));

create function private.track_source_verification() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
  new.verified := false; new.verified_at := null; new.revision := 1;
 else
  new.revision := old.revision + 1;
  if (to_jsonb(new) - array['verified','verified_at','revision','updated_at']) is distinct from
     (to_jsonb(old) - array['verified','verified_at','revision','updated_at']) then
   new.verified := false;
  end if;
  new.verified_at := case when new.verified then coalesce(old.verified_at, now()) else null end;
 end if;
 return new;
end $$;
revoke all on function private.track_source_verification() from public;
do $$ declare t text; begin
 foreach t in array array['candidate_facts','experiences','experience_bullets','education','projects'] loop
  execute format('create trigger track_source_verification before insert or update on public.%I for each row execute function private.track_source_verification()',t);
 end loop;
end $$;
create function private.track_profile_verification() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
  new.personal_verified := false; new.summary_verified := false; new.revision := 1;
  new.personal_verified_at := null; new.summary_verified_at := null;
 else
  new.revision := old.revision + 1;
  if (to_jsonb(new) - array['professional_summary','summary_source_reference','personal_verified','summary_verified','personal_verified_at','summary_verified_at','revision','updated_at']) is distinct from
     (to_jsonb(old) - array['professional_summary','summary_source_reference','personal_verified','summary_verified','personal_verified_at','summary_verified_at','revision','updated_at']) then
   new.personal_verified := false;
  end if;
  if new.professional_summary is distinct from old.professional_summary or new.summary_source_reference is distinct from old.summary_source_reference then new.summary_verified := false; end if;
  new.personal_verified_at := case when new.personal_verified then coalesce(old.personal_verified_at,now()) else null end;
  new.summary_verified_at := case when new.summary_verified then coalesce(old.summary_verified_at,now()) else null end;
 end if;
 return new;
end $$;
revoke all on function private.track_profile_verification() from public;
create trigger track_profile_verification before insert or update on public.candidate_profiles for each row execute function private.track_profile_verification();
commit;

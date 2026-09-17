begin;
-- A changed employer/role/date changes the context of every attached claim.
create function private.invalidate_experience_bullets() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if (to_jsonb(new) - array['verified','verified_at','revision','updated_at']) is distinct from
    (to_jsonb(old) - array['verified','verified_at','revision','updated_at']) then
  update public.experience_bullets set verified=false where experience_id=new.id;
 end if;
 return new;
end $$;
revoke all on function private.invalidate_experience_bullets() from public;
create trigger invalidate_experience_bullets after update on public.experiences
 for each row execute function private.invalidate_experience_bullets();
commit;

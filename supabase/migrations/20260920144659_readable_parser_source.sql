begin;
create function private.render_parser_source(value jsonb, field_path text default '', depth integer default 0) returns text
language plpgsql immutable security invoker set search_path='' as $$
declare result text:=''; entry record;
begin
 if depth>24 then raise exception 'Posting nesting exceeds supported depth'; end if;
 if value is null or jsonb_typeof(value)='null' then return ''; end if;
 if jsonb_typeof(value)='object' then
  for entry in select key,val from jsonb_each(value) as e(key,val) order by key collate "C" loop
   result:=result||private.render_parser_source(entry.val,case when field_path='' then entry.key else field_path||'.'||entry.key end,depth+1);
  end loop;
 elsif jsonb_typeof(value)='array' then
  for entry in select val,ord from jsonb_array_elements(value) with ordinality as e(val,ord) loop
   result:=result||private.render_parser_source(entry.val,field_path||'['||(entry.ord-1)::text||']',depth+1);
  end loop;
 else
  result:=field_path||E':\n'||(value#>>'{}')||E'\n\n';
 end if;
 return result;
end $$;
revoke all on function private.render_parser_source(jsonb,text,integer) from public,anon;
grant execute on function private.render_parser_source(jsonb,text,integer) to authenticated;
create or replace function public.job_parse_source(target_job uuid) returns text language plpgsql stable security invoker set search_path='' as $$
declare j public.jobs; r jsonb; posting jsonb;
begin
 select * into j from public.jobs where id=target_job and private.owns_profile(owner_profile_id);
 if not found then raise exception 'Job not found' using errcode='42501'; end if;
 r:=j.normalized_data->'raw';
 posting:=to_jsonb(j.posting_text);
 if j.posting_text is not null then
  begin
   if jsonb_typeof(j.posting_text::jsonb) in ('object','array') then posting:=j.posting_text::jsonb; end if;
  exception when invalid_text_representation then null; end;
 end if;
 return private.render_parser_source(jsonb_build_object(
 'provider_metadata',jsonb_build_object('provider',j.provider,'external_id',j.external_job_id,'title',j.title,'company',j.company,'location',j.location,'country',j.country,'employment_type',j.employment_type,'remote_type',j.remote_type,'posted_at',j.posted_at,'salary_min',j.salary_min,'salary_max',j.salary_max,'salary_currency',j.salary_currency,'salary_period',r->>'salaryPeriod','salary_estimated',r->'salaryEstimated'),
 'provider_description',j.description,'provider_description_complete',coalesce((r->>'descriptionComplete')::boolean,false),
 'original_posting_text',posting,'original_posting_text_origin',j.posting_text_origin
 ));
end $$;
commit;

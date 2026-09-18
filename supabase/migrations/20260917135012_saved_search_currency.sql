begin;
-- Existing records retain unknown currency; never infer a monetary unit.
alter table public.job_preferences add column salary_currency text
  check (salary_currency is null or salary_currency ~ '^[A-Z]{3}$');
commit;

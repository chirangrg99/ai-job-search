begin;
-- Explicit deny policies document the default-deny intent for client roles.
-- Only the authenticated, fixed-purpose private function accesses these rows as owner.
create policy deny_client_access on private.adzuna_requests for all to anon,authenticated using(false) with check(false);
create policy deny_client_access on private.adzuna_cooldown for all to anon,authenticated using(false) with check(false);
commit;

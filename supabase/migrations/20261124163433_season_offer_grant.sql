-- Run 3 fix (24 November 2026): /api/season calls public.issue_seasonal_offer
-- as service_role; the thin wrapper (not security definer) needs EXECUTE on the
-- private function it calls. Without it PostgREST answered 403 and no window was
-- granted. Service role only, as for the wrapper.
grant execute on function private.issue_seasonal_offer(uuid, uuid) to service_role;

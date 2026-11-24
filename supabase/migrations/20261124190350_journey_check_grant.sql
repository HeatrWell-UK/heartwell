-- Run 4 fix (24 November 2026): the CHECK constraint added by journeys_reports
-- calls private.journey_metadata_ok, which only the owner could execute. Every
-- insert into attribution_actions by service_role (page views, basket steps,
-- WhatsApp notes and journey events) was refused with 403 from about 16:14 UTC
-- on 24 Nov. The function is immutable, reads nothing and is safe to execute.
grant execute on function private.journey_metadata_ok(jsonb) to service_role, authenticated;

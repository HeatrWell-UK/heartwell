-- Phase 17: the one figure an outside monitor (UptimeRobot) may read: how
-- many health checks are red right now, and when the hourly check last ran.
-- Counts and a time only; what is red stays in the admin.

create function private.health_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'red', (select count(*) from private.alerts a where a.resolved_at is null),
    'last_check', (select max(r.finished_at) from public.job_runs r where r.job = 'health-check' and r.status = 'ok')
  );
$$;

create function public.health_state() returns jsonb language sql stable set search_path = '' as $$ select private.health_state() $$;

revoke all on function private.health_state(), public.health_state() from public;
grant execute on function private.health_state(), public.health_state() to anon, authenticated, service_role;

-- The admin Status page's data, and the scheduled jobs that live wholly in
-- the database.
--
-- Jobs that call the website (conversion sending, review requests, the Monday
-- digest, the hourly health check) are scheduled in the phases that build
-- their endpoints, with the endpoint secret held in Vault.

-- ---------------------------------------------------------------------------
-- Daily clean-up: keep personal data only as long as it's needed.

create or replace function public.run_daily_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run bigint;
  v_leads integer;
  v_cleared integer;
  v_actions integer;
  v_sessions integer;
  v_runs integer;
  v_pushes integer;
  v_detail jsonb;
begin
  insert into public.job_runs (job) values ('daily-cleanup') returning id into v_run;

  begin
    -- Basket reminders expire after 90 days.
    delete from public.basket_reminder_leads where expires_at < now();
    get diagnostics v_leads = row_count;

    -- Closed leads keep no contact details.
    update public.basket_reminder_leads
    set email = null, phone = null, basket = '[]'::jsonb
    where status in ('converted', 'unsubscribed')
      and (email is not null or phone is not null or basket <> '[]'::jsonb);
    get diagnostics v_cleared = row_count;

    -- Attribution older than 26 months isn't needed for any report.
    delete from public.attribution_actions where created_at < now() - interval '26 months';
    get diagnostics v_actions = row_count;
    delete from public.attribution_sessions where last_seen_at < now() - interval '26 months';
    get diagnostics v_sessions = row_count;

    -- Operational logs.
    delete from public.job_runs where started_at < now() - interval '90 days' and id <> v_run;
    get diagnostics v_runs = row_count;
    delete from orderflow.push_log where pushed_at < now() - interval '30 days';
    get diagnostics v_pushes = row_count;

    v_detail := jsonb_build_object(
      'expired_leads', v_leads, 'cleared_leads', v_cleared,
      'old_actions', v_actions, 'old_sessions', v_sessions,
      'old_job_runs', v_runs, 'old_pushes', v_pushes
    );
    update public.job_runs set finished_at = now(), status = 'ok', detail = v_detail where id = v_run;
    return v_detail;
  exception when others then
    update public.job_runs set finished_at = now(), status = 'failed', error = sqlerrm where id = v_run;
    return jsonb_build_object('error', sqlerrm);
  end;
end;
$$;

revoke all on function public.run_daily_cleanup() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schedules (pg_cron, UTC)

select cron.schedule('heartwell-daily-cleanup', '15 3 * * *', $$select public.run_daily_cleanup()$$);
select cron.schedule('heartwell-orderflow-resend', '*/15 * * * *', $$select orderflow.resend_recent()$$);

-- ---------------------------------------------------------------------------
-- Everything the admin Status page shows, in one call.

create or replace function public.admin_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.require_admin();

  select jsonb_build_object(
    'database', jsonb_build_object(
      'time', now(),
      'postgres', current_setting('server_version'),
      'migrations', (select count(*) from supabase_migrations.schema_migrations),
      'latest_migration', (
        select m.version || ' ' || coalesce(m.name, '')
        from supabase_migrations.schema_migrations m
        order by m.version desc limit 1
      )
    ),
    'catalogue', jsonb_build_object(
      'products', (select count(*) from public.products),
      'active_products', (select count(*) from public.products where is_active),
      'variants', (select count(*) from public.product_variants),
      'categories', (select count(*) from public.categories),
      'materials', (select count(*) from public.materials)
    ),
    'orders', jsonb_build_object(
      'real', (select count(*) from public.orders where not is_test),
      'test', (select count(*) from public.orders where is_test),
      'awaiting_confirmation', (select count(*) from public.orders where status = 'pending_cod' and not is_test),
      'latest', (select max(created_at) from public.orders where not is_test)
    ),
    'admins', (select count(*) from public.admins where is_active),
    'settings', (select to_jsonb(s) - 'id' from public.shop_settings s where s.id),
    'cron', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', j.jobname,
        'schedule', j.schedule,
        'active', j.active,
        'last_status', d.status,
        'last_run', d.start_time,
        'last_message', left(d.return_message, 200)
      ) order by j.jobname)
      from cron.job j
      left join lateral (
        select r.status, r.start_time, r.return_message
        from cron.job_run_details r
        where r.jobid = j.jobid
        order by r.start_time desc
        limit 1
      ) d on true
    ), '[]'::jsonb),
    'jobs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'job', x.job, 'status', x.status, 'started_at', x.started_at,
        'finished_at', x.finished_at, 'error', x.error
      ) order by x.job)
      from (
        select distinct on (job) job, status, started_at, finished_at, error
        from public.job_runs
        order by job, started_at desc
      ) x
    ), '[]'::jsonb),
    'email', jsonb_build_object(
      'last_sent', (select max(created_at) from public.email_log where status = 'sent'),
      'last_failed', (select max(created_at) from public.email_log where status = 'failed'),
      'failed_24h', (select count(*) from public.email_log where status = 'failed' and created_at > now() - interval '24 hours')
    ),
    'conversions', jsonb_build_object(
      'pending', (select count(*) from public.conversion_outbox where status in ('pending', 'held')),
      'failed', (select count(*) from public.conversion_outbox where status = 'failed'),
      'last_sent', (select max(sent_at) from public.conversion_outbox where status = 'sent')
    ),
    'orderflow', jsonb_build_object(
      'enabled', (select s.orderflow_enabled from public.shop_settings s where s.id),
      'configured', (
        select count(*) = 2 from vault.decrypted_secrets
        where name in ('orderflow_ingest_url', 'orderflow_ingest_key')
      ),
      'last_push', (select max(pushed_at) from orderflow.push_log)
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_status() from public, anon;
grant execute on function public.admin_status() to authenticated;

-- Phase 16: the daily clean-up keeps the promises in the privacy notice.
-- New: sample requests (2 years), email log (2 years), WhatsApp enquiries
-- (26 months, like the rest of the visit records), newsletter addresses that
-- were never confirmed (30 days) or unsubscribed (removed at the next run).
-- Unchanged: basket reminders 90 days, visit records 26 months, handled
-- contact messages 2 years, tracking log 30 days, job runs 90 days,
-- OrderFlow push log 30 days.

create or replace function public.run_daily_cleanup()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_run bigint;
  v_leads integer;
  v_cleared integer;
  v_actions integer;
  v_sessions integer;
  v_runs integer;
  v_pushes integer;
  v_messages integer;
  v_tracking integer;
  v_samples integer;
  v_emails integer;
  v_whatsapp integer;
  v_newsletter integer;
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
    delete from public.whatsapp_enquiries where created_at < now() - interval '26 months';
    get diagnostics v_whatsapp = row_count;

    -- Contact messages, once dealt with, are kept two years.
    delete from public.contact_messages where status <> 'new' and created_at < now() - interval '24 months';
    get diagnostics v_messages = row_count;

    -- Sample requests (name, address, contact details) are kept two years.
    delete from public.sample_requests where created_at < now() - interval '24 months';
    get diagnostics v_samples = row_count;

    -- Newsletter: unconfirmed sign-ups lapse after 30 days; unsubscribed addresses are removed.
    delete from public.newsletter_subscribers
    where status = 'unsubscribed'
       or (status = 'pending' and created_at < now() - interval '30 days');
    get diagnostics v_newsletter = row_count;

    -- Operational logs.
    delete from public.email_log where created_at < now() - interval '24 months';
    get diagnostics v_emails = row_count;
    delete from public.tracking_log where created_at < now() - interval '30 days';
    get diagnostics v_tracking = row_count;
    delete from public.job_runs where started_at < now() - interval '90 days' and id <> v_run;
    get diagnostics v_runs = row_count;
    delete from orderflow.push_log where pushed_at < now() - interval '30 days';
    get diagnostics v_pushes = row_count;

    v_detail := jsonb_build_object(
      'expired_leads', v_leads, 'cleared_leads', v_cleared,
      'old_actions', v_actions, 'old_sessions', v_sessions, 'old_whatsapp', v_whatsapp,
      'old_messages', v_messages, 'old_samples', v_samples, 'newsletter_removed', v_newsletter,
      'old_emails', v_emails, 'old_tracking_log', v_tracking,
      'old_job_runs', v_runs, 'old_pushes', v_pushes
    );
    update public.job_runs set finished_at = now(), status = 'ok', detail = v_detail where id = v_run;
    return v_detail;
  exception when others then
    update public.job_runs set finished_at = now(), status = 'failed', error = sqlerrm where id = v_run;
    return jsonb_build_object('error', sqlerrm);
  end;
end;
$function$;

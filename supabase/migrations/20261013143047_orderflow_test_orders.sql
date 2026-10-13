-- OrderFlow can also take test orders automatically, marked TEST.
--
-- Before launch every order is a test order ("placed before launch"), so with
-- test orders kept back nothing reached OrderFlow on its own and the owner
-- couldn't try the real flow: placed, confirmed, then each status change.
-- shop_settings.orderflow_send_tests (off by default) lets test orders go the
-- same way real ones do, with "TEST " in front of the reference as before. The
-- Health card turns amber if it's still on once the shop is live.

alter table public.shop_settings
  add column orderflow_send_tests boolean not null default false;

comment on column public.shop_settings.orderflow_send_tests is
  'Also send test orders to OrderFlow automatically (marked TEST). For trying the flow before launch; switch off at go-live.';

-- Sends one order. Automatic pushes need OrderFlow switched on, and a test
-- order also needs orderflow_send_tests; a push by hand (p_manual) only needs
-- the Vault values. Returns pg_net's request ID, or null when nothing was sent.
create or replace function orderflow.push_order(p_order_id uuid, p_manual boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
  v_request bigint;
begin
  if not p_manual then
    if not coalesce((select s.orderflow_enabled from public.shop_settings s where s.id), false) then
      return null;
    end if;
    if coalesce((select o.is_test from public.orders o where o.id = p_order_id), true)
       and not coalesce((select s.orderflow_send_tests from public.shop_settings s where s.id), false) then
      return null;
    end if;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'orderflow_ingest_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'orderflow_ingest_key';
  if v_url is null or v_key is null or not exists (select 1 from public.orders o where o.id = p_order_id) then
    return null;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-orderflow-key', v_key),
    body := orderflow.order_payload(p_order_id),
    timeout_milliseconds := 10000
  ) into v_request;

  insert into orderflow.push_log (order_id, request_id, manual) values (p_order_id, v_request, p_manual);
  return v_request;
end;
$$;

-- Every 15 minutes: record replies, then re-post any order changed in the
-- last three days that OrderFlow hasn't accepted since its last change (test
-- orders too while orderflow_send_tests is on).
create or replace function orderflow.resend_recent(p_window interval default interval '3 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  r record;
  v_run bigint;
  v_tests boolean;
begin
  perform orderflow.collect_replies();
  if not coalesce((select s.orderflow_enabled from public.shop_settings s where s.id), false) then
    return 0;
  end if;
  v_tests := coalesce((select s.orderflow_send_tests from public.shop_settings s where s.id), false);

  insert into public.job_runs (job) values ('orderflow-resend') returning id into v_run;

  if (select count(*) from vault.decrypted_secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key')) < 2 then
    update public.job_runs
    set finished_at = now(), status = 'skipped', error = 'OrderFlow’s address or key isn’t in Supabase Vault yet'
    where id = v_run;
    return 0;
  end if;

  for r in
    select o.id
    from public.orders o
    where (not o.is_test or v_tests)
      and greatest(o.created_at, o.updated_at) > now() - p_window
      and not exists (
        select 1 from orderflow.push_log l
        where l.order_id = o.id
          and l.status_code between 200 and 299
          and l.pushed_at >= greatest(o.created_at, o.updated_at)
      )
    order by o.created_at desc
    limit 200
  loop
    begin
      if orderflow.push_order(r.id) is not null then
        n := n + 1;
      end if;
    exception when others then
      raise warning 'orderflow resend failed for order %: %', r.id, sqlerrm;
    end;
  end loop;

  update public.job_runs
  set finished_at = now(), status = 'ok', detail = jsonb_build_object('pushed', n)
  where id = v_run;
  return n;
end;
$$;

revoke all on all functions in schema orderflow from public, anon, authenticated;

-- The Settings card also shows the test-order switch.
create or replace function private.admin_orderflow()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'enabled', (select s.orderflow_enabled from public.shop_settings s where s.id),
    'send_tests', (select s.orderflow_send_tests from public.shop_settings s where s.id),
    'configured', (select count(*) = 2 from vault.decrypted_secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key')),
    'recent', coalesce((
      select jsonb_agg(x order by x.pushed_at desc)
      from (
        select l.id, l.pushed_at, l.manual, l.status_code, l.outcome, l.error, l.checked_at, o.reference, o.status, o.is_test, o.id as order_id
        from orderflow.push_log l
        join public.orders o on o.id = l.order_id
        order by l.pushed_at desc
        limit 15
      ) x
    ), '[]'::jsonb),
    'test_order', (
      select jsonb_build_object('id', o.id, 'reference', o.reference)
      from public.orders o
      where o.is_test
      order by o.created_at desc
      limit 1
    )
  );
end;
$$;

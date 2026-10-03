-- OrderFlow: the shared order-management tool, tagged as Heartwell.
--
-- Every new or changed real order is pushed to OrderFlow's ingest endpoint
-- with pg_net. It does nothing at all until both are true:
--   * shop_settings.orderflow_enabled is on, and
--   * Vault holds orderflow_ingest_url and orderflow_ingest_key (Phase 17).
-- Test orders are never sent. A push failure never fails the sale; every push
-- is logged so the admin Health card can show OrderFlow's replies.

create schema if not exists orderflow;
revoke all on schema orderflow from public, anon, authenticated;

create table orderflow.push_log (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  request_id bigint,
  pushed_at timestamptz not null default now()
);

create index push_log_order_idx on orderflow.push_log (order_id);
create index push_log_pushed_idx on orderflow.push_log (pushed_at desc);

alter table orderflow.push_log enable row level security;

create or replace function orderflow.order_payload(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'external_id', o.id::text,
    'reference', o.reference,
    'shop', 'heartwell',
    'status', o.status,
    'placed_at', to_jsonb(o.created_at),
    'postcode', o.postcode,
    'delivery_date', to_char(o.preferred_delivery_date, 'YYYY-MM-DD'),
    'total', round(o.total_amount, 2),
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               -- The warehouse knows the trade name; a staff-typed name wins.
               'product_name', coalesce(oi.custom_title, oi.trade_title, oi.title),
               'sku', oi.sku,
               'variant', coalesce(oi.material_name, oi.colour_name),
               'quantity', oi.quantity,
               'unit_price', round(oi.unit_price, 2)
             )) order by oi.created_at, oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  ))
  from public.orders o
  where o.id = p_order_id;
$$;

create or replace function orderflow.push_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
  v_request bigint;
begin
  if not coalesce((select s.orderflow_enabled from public.shop_settings s where s.id), false) then
    return;
  end if;
  if coalesce((select o.is_test from public.orders o where o.id = p_order_id), true) then
    return;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'orderflow_ingest_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'orderflow_ingest_key';
  if v_url is null or v_key is null then
    return;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-orderflow-key', v_key),
    body := orderflow.order_payload(p_order_id),
    timeout_milliseconds := 10000
  ) into v_request;

  insert into orderflow.push_log (order_id, request_id) values (p_order_id, v_request);
end;
$$;

create or replace function orderflow.orders_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform orderflow.push_order(new.id);
  exception when others then
    -- A sale must never fail because OrderFlow could not be told about it.
    raise warning 'orderflow push failed for order %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

create or replace function orderflow.order_items_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid := coalesce(new.order_id, old.order_id);
  v_placed timestamptz;
begin
  select o.created_at into v_placed from public.orders o where o.id = v_order;
  -- Gone, or created in this transaction (the deferred insert trigger sends it whole).
  if v_placed is null or v_placed >= now() then
    return null;
  end if;
  begin
    perform orderflow.push_order(v_order);
  exception when others then
    raise warning 'orderflow push failed for order %: %', v_order, sqlerrm;
  end;
  return null;
end;
$$;

-- Re-send anything that moved in the last few days, in case a push was lost.
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
begin
  if not coalesce((select s.orderflow_enabled from public.shop_settings s where s.id), false) then
    return 0;
  end if;

  insert into public.job_runs (job) values ('orderflow-resend') returning id into v_run;

  for r in
    select o.id
    from public.orders o
    where not o.is_test
      and greatest(o.created_at, o.updated_at) > now() - p_window
    order by o.created_at desc
    limit 200
  loop
    begin
      perform orderflow.push_order(r.id);
      n := n + 1;
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

create constraint trigger orderflow_push_on_insert
  after insert on public.orders
  deferrable initially deferred
  for each row execute function orderflow.orders_changed();

create trigger orderflow_push_on_update
  after update of status, preferred_delivery_date, total_amount, shipping_address, postcode, is_test
  on public.orders
  for each row execute function orderflow.orders_changed();

create constraint trigger orderflow_push_on_item_change
  after insert or update or delete on public.order_items
  deferrable initially deferred
  for each row execute function orderflow.order_items_changed();

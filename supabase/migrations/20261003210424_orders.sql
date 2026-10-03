-- Orders.
--
-- Cash or bank transfer on delivery. An order counts only once the customer
-- confirms it. The lifecycle is
--
--   pending_cod -> confirmed -> processing -> shipped -> delivered
--        \______________\____________\___________\________-> cancelled
--
-- and each step's timestamp is stamped once, by the trigger below, never by a
-- caller. Staff can correct a mis-tap between the post-confirmation steps; an
-- order can never go back to pending_cod, and cancelled is final.
--
-- Every order has a private id (the confirm link) and a human reference,
-- HW-100101, shown on emails, tracking, delivery notes and OrderFlow. Each line
-- keeps the product's name, SKU and price as they were when ordered, so editing
-- the catalogue never rewrites an old order.
--
-- Nothing writes these tables directly: place_order, confirm_order,
-- place_manual_order, update_order_details and set_order_status do, and admins
-- read them under row level security.

create sequence public.order_number_seq as bigint start with 100101 minvalue 100001 no cycle;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  reference text generated always as ('HW-' || order_number::text) stored,
  status text not null default 'pending_cod'
    check (status in ('pending_cod', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  source text not null default 'website' check (source in ('website', 'whatsapp', 'phone')),

  -- Test orders never send conversions, never reach OrderFlow and are left out of reports.
  is_test boolean not null default false,
  test_reason text,

  -- Customer
  customer_name text not null check (length(btrim(customer_name)) between 2 and 120),
  customer_email text check (
    customer_email is null
    or (length(customer_email) <= 254 and customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  customer_phone text not null check (length(btrim(customer_phone)) between 7 and 30),
  shipping_address text not null check (length(btrim(shipping_address)) between 5 and 400),
  postcode text not null check (length(postcode) between 5 and 8),
  delivery_zone text not null default 'MAINLAND_STANDARD'
    check (delivery_zone in ('MAINLAND_STANDARD', 'CUSTOM_QUOTE')),
  special_instructions text check (special_instructions is null or length(special_instructions) <= 1000),
  -- A request the team confirms by phone, not a booking. Null = as soon as possible.
  preferred_delivery_date date,

  -- Money. Every figure is worked out by the database, never sent by a browser.
  items_subtotal numeric(10,2) not null default 0 check (items_subtotal >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  discount_tier text check (discount_tier is null or discount_tier in ('HIGH', 'MID', 'STANDARD', 'EXCLUDED')),
  promotion_code text check (promotion_code is null or promotion_code = upper(btrim(promotion_code))),
  offer_source text check (offer_source is null or offer_source in ('manual_code', 'paid_entitlement')),
  delivery_floor smallint not null default 0 check (delivery_floor between 0 and 50),
  delivery_has_lift boolean not null default false,
  fee_upstairs numeric(10,2) not null default 0 check (fee_upstairs >= 0),
  wants_assembly boolean not null default false,
  fee_assembly numeric(10,2) not null default 0 check (fee_assembly >= 0),
  wants_removal boolean not null default false,
  removal_seats smallint check (removal_seats is null or removal_seats between 1 and 50),
  fee_removal numeric(10,2) not null default 0 check (fee_removal >= 0),
  delivery_total numeric(10,2) not null default 0 check (delivery_total >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  has_made_to_order boolean not null default false,

  -- Lifecycle, stamped once each by orders_lifecycle().
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by text check (confirmed_by is null or confirmed_by in ('customer', 'staff')),
  processing_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  review_request_sent_at timestamptz,

  -- Tracking. The browser and server copies of Purchase share this event ID.
  purchase_event_id uuid not null unique default gen_random_uuid(),
  -- The visitor's cookie choice at checkout (decision D10 reads it).
  tracking_consent text not null default 'unknown' check (tracking_consent in ('granted', 'denied', 'unknown')),

  -- First-party attribution, saved at checkout.
  visitor_id uuid,
  session_id uuid,
  arrival_id uuid,
  gclid text,
  gbraid text,
  wbraid text,
  fbclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  ga_client_id text,
  meta_fbp text,
  meta_fbc text,
  customer_ip text,
  customer_user_agent text,
  whatsapp_reference text,
  manual_acquisition_source text check (
    manual_acquisition_source is null
    or manual_acquisition_source in ('meta', 'google', 'direct', 'referral', 'other')
  ),
  manual_acquisition_note text,
  manual_acquisition_at timestamptz
);

create index orders_created_idx on public.orders (created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_session_idx on public.orders (session_id) where session_id is not null;
create index orders_visitor_idx on public.orders (visitor_id) where visitor_id is not null;
create index orders_whatsapp_reference_idx on public.orders (whatsapp_reference) where whatsapp_reference is not null;

comment on column public.orders.id is
  'Private. Forms the confirm link, so it is never shown in a URL that reaches Meta or Google.';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  -- As they were when ordered.
  title text not null,
  trade_title text,
  sku text not null,
  colour_name text,
  material_id uuid references public.materials (id) on delete set null,
  material_code text,
  material_name text,
  material_collection text,
  customisation jsonb check (customisation is null or jsonb_typeof(customisation) = 'object'),
  -- A name typed by staff for something built to order. Wins over title everywhere.
  custom_title text check (custom_title is null or length(custom_title) <= 120),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_material_idx on public.order_items (material_id) where material_id is not null;

-- The order's history: placed, every status change (with who made it), edits.
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in ('placed', 'status_changed', 'details_updated', 'test_flag_changed', 'note')),
  from_status text,
  to_status text,
  -- The admin who acted; null for the customer or the system.
  actor uuid references auth.users (id) on delete set null,
  note text
);

create index order_events_order_idx on public.order_events (order_id, at);
create index order_events_actor_idx on public.order_events (actor) where actor is not null;

alter table public.email_log
  add constraint email_log_order_id_fkey foreign key (order_id) references public.orders (id) on delete set null;
create index email_log_order_idx on public.email_log (order_id) where order_id is not null;

-- ---------------------------------------------------------------------------
-- Lifecycle

create or replace function public.order_status_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from = p_to then true
    when p_from = 'pending_cod' then p_to in ('confirmed', 'cancelled')
    when p_from in ('confirmed', 'processing', 'shipped', 'delivered')
      then p_to in ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    else false
  end;
$$;

create or replace function public.orders_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Every order starts unconfirmed, whoever creates it.
    new.status := 'pending_cod';
    new.confirmed_at := null;
    new.confirmed_by := null;
    new.processing_at := null;
    new.shipped_at := null;
    new.delivered_at := null;
    new.cancelled_at := null;
    new.postcode := public.normalise_postcode(new.postcode);
    return new;
  end if;

  if not public.order_status_allowed(old.status, new.status) then
    raise exception 'BAD_STATUS_CHANGE: % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- Timestamps are the trigger's alone: keep what was stamped, stamp the step
  -- being entered for the first time.
  new.confirmed_at := old.confirmed_at;
  new.processing_at := old.processing_at;
  new.shipped_at := old.shipped_at;
  new.delivered_at := old.delivered_at;
  new.cancelled_at := old.cancelled_at;
  new.created_at := old.created_at;
  new.order_number := old.order_number;
  new.purchase_event_id := old.purchase_event_id;
  -- Who confirmed is recorded once, at the moment of confirmation.
  if old.confirmed_by is not null or old.status <> 'pending_cod' or new.status <> 'confirmed' then
    new.confirmed_by := old.confirmed_by;
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'confirmed' then
        new.confirmed_at := coalesce(old.confirmed_at, now());
        new.confirmed_by := coalesce(new.confirmed_by, 'staff');
      when 'processing' then new.processing_at := coalesce(old.processing_at, now());
      when 'shipped' then new.shipped_at := coalesce(old.shipped_at, now());
      when 'delivered' then new.delivered_at := coalesce(old.delivered_at, now());
      when 'cancelled' then new.cancelled_at := coalesce(old.cancelled_at, now());
      else null;
    end case;
  end if;

  new.postcode := public.normalise_postcode(new.postcode);
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_lifecycle
  before insert or update on public.orders
  for each row execute function public.orders_lifecycle();

create or replace function public.orders_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, kind, to_status, actor)
    values (new.id, 'placed', new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_events (order_id, kind, from_status, to_status, actor, note)
    values (new.id, 'status_changed', old.status, new.status, auth.uid(),
            case when new.status = 'cancelled' then new.cancellation_reason end);
  elsif new.is_test is distinct from old.is_test then
    insert into public.order_events (order_id, kind, actor, note)
    values (new.id, 'test_flag_changed', auth.uid(),
            case when new.is_test then 'Marked as test' else 'Marked as real' end
              || coalesce(': ' || new.test_reason, ''));
  end if;
  return null;
end;
$$;

revoke all on function public.orders_log_event() from public, anon, authenticated;

create trigger orders_log_event
  after insert or update on public.orders
  for each row execute function public.orders_log_event();

-- ---------------------------------------------------------------------------
-- Conversion outbox
--
-- One row per (order, platform, event): the unique key is what makes Purchase
-- exactly-once. The sender (Phase 14) claims a row, sends it, and stores the
-- platform's response here, so a failure is on record rather than lost.

create table public.conversion_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  platform text not null check (platform in ('meta', 'ga4', 'google_ads')),
  event_name text not null check (event_name ~ '^[A-Za-z][A-Za-z0-9_]{2,40}$'),
  event_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'held', 'sending', 'sent', 'failed', 'skipped')),
  send_after timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  lease_until timestamptz,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  response jsonb,
  error jsonb,
  skip_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversion_outbox_once unique (order_id, platform, event_name)
);

create index conversion_outbox_due_idx on public.conversion_outbox (send_after)
  where status in ('pending', 'failed');

create trigger conversion_outbox_updated_at before update on public.conversion_outbox
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: admins read; nobody writes directly.

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.conversion_outbox enable row level security;

revoke all on table public.orders, public.order_items, public.order_events, public.conversion_outbox
  from anon, authenticated;
grant select on table public.orders, public.order_items, public.order_events, public.conversion_outbox
  to authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;

create policy "admins read orders" on public.orders for select to authenticated
  using ((select public.is_admin()));
create policy "admins read order items" on public.order_items for select to authenticated
  using ((select public.is_admin()));
create policy "admins read order events" on public.order_events for select to authenticated
  using ((select public.is_admin()));
create policy "admins read the conversion outbox" on public.conversion_outbox for select to authenticated
  using ((select public.is_admin()));

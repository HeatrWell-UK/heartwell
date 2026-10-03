-- Everything about a shopper that isn't an order: where they came from, the
-- WhatsApp conversations they started, basket reminders they asked for,
-- newsletter sign-ups, fabric samples, reviews and the automatic ad-visitor
-- offer.
--
-- All of it is personal or commercial data, so anon and authenticated have no
-- direct access. The server writes it with the secret key (or through the
-- SECURITY DEFINER functions below) and admins read it under row level
-- security. Approved reviews are the one public read.

-- ---------------------------------------------------------------------------
-- First-party attribution
--
-- Saved for every visitor under the UK analytics exemption: no advertising
-- identifiers unless the visitor agreed (meta_fbp/meta_fbc are only filled with
-- consent). Orders, WhatsApp enquiries and sample requests copy the session's
-- values at the moment they are made.

create table public.attribution_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  session_id uuid not null,
  arrival_id uuid not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_content text,
  first_touch_term text,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_content text,
  last_touch_term text,
  gclid text,
  gbraid text,
  wbraid text,
  fbclid text,
  ga_client_id text,
  meta_fbp text,
  meta_fbc text,
  landing_page text,
  referrer text,
  initial_product_id uuid references public.products (id) on delete set null,
  initial_variant_id uuid references public.product_variants (id) on delete set null,
  is_test boolean not null default false
);

create index attribution_sessions_visitor_idx on public.attribution_sessions (visitor_id);
create index attribution_sessions_session_idx on public.attribution_sessions (session_id);
create index attribution_sessions_created_idx on public.attribution_sessions (created_at);
create index attribution_sessions_product_idx on public.attribution_sessions (initial_product_id)
  where initial_product_id is not null;
create index attribution_sessions_variant_idx on public.attribution_sessions (initial_variant_id)
  where initial_variant_id is not null;

create table public.attribution_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id uuid,
  session_id uuid,
  arrival_id uuid,
  -- The vocabulary lives in src/lib/attribution (arrival, product_view,
  -- add_to_basket, checkout_start, whatsapp_click, order_placed, ...).
  action_type text not null check (action_type ~ '^[a-z][a-z0-9_]{2,40}$'),
  page_url text,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  whatsapp_reference text,
  order_id uuid references public.orders (id) on delete set null,
  metadata jsonb check (metadata is null or jsonb_typeof(metadata) = 'object'),
  is_test boolean not null default false
);

create index attribution_actions_created_idx on public.attribution_actions (created_at);
create index attribution_actions_type_created_idx on public.attribution_actions (action_type, created_at);
create index attribution_actions_session_idx on public.attribution_actions (session_id);
create index attribution_actions_visitor_idx on public.attribution_actions (visitor_id);
create index attribution_actions_order_idx on public.attribution_actions (order_id) where order_id is not null;
create index attribution_actions_product_idx on public.attribution_actions (product_id) where product_id is not null;
create index attribution_actions_variant_idx on public.attribution_actions (variant_id) where variant_id is not null;

-- ---------------------------------------------------------------------------
-- WhatsApp enquiries
--
-- Every WhatsApp button press gets a reference (HW-WA-261004-K7M2QX) written
-- into the pre-filled message. When the chat turns into an order, staff enter
-- the reference and the order inherits the enquiry's attribution.

create table public.whatsapp_enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('HW-WA-' || to_char(now() at time zone 'Europe/London', 'YYMMDD') || '-' || public.random_code(6))
    check (reference ~ '^HW-WA-[0-9]{6}-[A-Z0-9]{6}$'),
  created_at timestamptz not null default now(),
  visitor_id uuid,
  session_id uuid,
  arrival_id uuid,
  page_url text,
  page_context text,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text,
  gclid text,
  gbraid text,
  wbraid text,
  fbclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  ga_client_id text,
  meta_fbp text,
  meta_fbc text,
  converted_order_id uuid references public.orders (id) on delete set null,
  converted_at timestamptz,
  is_test boolean not null default false
);

create index whatsapp_enquiries_created_idx on public.whatsapp_enquiries (created_at);
create index whatsapp_enquiries_session_idx on public.whatsapp_enquiries (session_id);
create index whatsapp_enquiries_product_idx on public.whatsapp_enquiries (product_id) where product_id is not null;
create index whatsapp_enquiries_variant_idx on public.whatsapp_enquiries (variant_id) where variant_id is not null;
create index whatsapp_enquiries_order_idx on public.whatsapp_enquiries (converted_order_id)
  where converted_order_id is not null;

-- ---------------------------------------------------------------------------
-- Basket reminders
--
-- A shopper who leaves checkout can ask to be reminded by email or WhatsApp.
-- Contact details are kept only while the lead is open: ordering, opting out
-- or the 90-day expiry clears them.

create table public.basket_reminder_leads (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  session_id uuid not null unique,
  arrival_id uuid not null,
  email text,
  phone text,
  email_opt_in boolean not null default false,
  whatsapp_opt_in boolean not null default false,
  consent_at timestamptz not null default now(),
  -- Which wording the shopper agreed to, so consent can be shown later.
  consent_copy_version text not null,
  basket jsonb not null default '[]'::jsonb check (jsonb_typeof(basket) = 'array'),
  status text not null default 'active' check (status in ('active', 'converted', 'unsubscribed', 'done')),
  converted_order_id uuid references public.orders (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  reminder_sent_at timestamptz,
  done_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint basket_reminder_channel_required check (status <> 'active' or email_opt_in or whatsapp_opt_in),
  constraint basket_reminder_email_if_opted check (
    status <> 'active' or not email_opt_in or (email is not null and length(btrim(email)) > 3)
  ),
  constraint basket_reminder_phone_if_opted check (
    status <> 'active' or not whatsapp_opt_in or (phone is not null and length(btrim(phone)) >= 10)
  )
);

create index basket_reminder_status_expires_idx on public.basket_reminder_leads (status, expires_at);
create index basket_reminder_order_idx on public.basket_reminder_leads (converted_order_id)
  where converted_order_id is not null;

create trigger basket_reminder_leads_updated_at before update on public.basket_reminder_leads
  for each row execute function public.set_updated_at();

-- An order from the same session closes the lead and clears its contact data.
create or replace function public.basket_reminder_mark_converted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.session_id is not null then
    update public.basket_reminder_leads
    set status = 'converted',
        converted_order_id = new.id,
        email = null,
        phone = null,
        basket = '[]'::jsonb
    where session_id = new.session_id
      and status in ('active', 'done');
  end if;
  return null;
end;
$$;

revoke all on function public.basket_reminder_mark_converted() from public, anon, authenticated;

create trigger orders_basket_reminder_converted
  after insert or update of session_id on public.orders
  for each row execute function public.basket_reminder_mark_converted();

-- ---------------------------------------------------------------------------
-- Newsletter (double opt-in)

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email))),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirm_token uuid not null default gen_random_uuid(),
  unsubscribe_token uuid not null default gen_random_uuid(),
  consent_ip text,
  consent_user_agent text,
  subscribed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index newsletter_confirm_token_idx on public.newsletter_subscribers (confirm_token);
create index newsletter_unsubscribe_token_idx on public.newsletter_subscribers (unsubscribe_token);
create index newsletter_status_idx on public.newsletter_subscribers (status);

create or replace function public.newsletter_subscribe(
  p_email text,
  p_ip text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_row public.newsletter_subscribers%rowtype;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    return jsonb_build_object('outcome', 'invalid_email');
  end if;

  select * into v_row from public.newsletter_subscribers where email = v_email;

  if found and v_row.status = 'confirmed' then
    return jsonb_build_object('outcome', 'already_confirmed');
  end if;

  if found then
    -- One confirmation email every two minutes at most.
    if v_row.last_sent_at is not null and v_row.last_sent_at > now() - interval '2 minutes' then
      return jsonb_build_object('outcome', 'throttled');
    end if;

    update public.newsletter_subscribers
    set status = 'pending',
        confirm_token = gen_random_uuid(),
        consent_ip = coalesce(public.clean_text(p_ip, 64), consent_ip),
        consent_user_agent = coalesce(public.clean_text(p_user_agent, 400), consent_user_agent),
        subscribed_at = now(),
        confirmed_at = null,
        unsubscribed_at = null,
        last_sent_at = now()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.newsletter_subscribers (email, consent_ip, consent_user_agent, last_sent_at)
    values (v_email, public.clean_text(p_ip, 64), public.clean_text(p_user_agent, 400), now())
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'outcome', 'confirmation_required',
    'email', v_row.email,
    'confirm_token', v_row.confirm_token
  );
end;
$$;

create or replace function public.newsletter_confirm(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.newsletter_subscribers%rowtype;
begin
  select * into v_row from public.newsletter_subscribers where confirm_token = p_token;
  if not found then
    return jsonb_build_object('outcome', 'invalid_token');
  end if;

  if v_row.status = 'confirmed' then
    return jsonb_build_object('outcome', 'already_confirmed', 'email', v_row.email,
                              'unsubscribe_token', v_row.unsubscribe_token);
  end if;

  update public.newsletter_subscribers
  set status = 'confirmed', confirmed_at = now(), unsubscribed_at = null
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object('outcome', 'confirmed', 'email', v_row.email,
                            'unsubscribe_token', v_row.unsubscribe_token);
end;
$$;

create or replace function public.newsletter_unsubscribe(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.newsletter_subscribers%rowtype;
begin
  select * into v_row from public.newsletter_subscribers where unsubscribe_token = p_token;
  if not found then
    return jsonb_build_object('outcome', 'invalid_token');
  end if;

  update public.newsletter_subscribers
  set status = 'unsubscribed', unsubscribed_at = now()
  where id = v_row.id;

  return jsonb_build_object('outcome', 'unsubscribed', 'email', v_row.email);
end;
$$;

revoke all on function public.newsletter_subscribe(text, text, text) from public, anon, authenticated;
revoke all on function public.newsletter_confirm(uuid) from public, anon, authenticated;
revoke all on function public.newsletter_unsubscribe(uuid) from public, anon, authenticated;
grant execute on function public.newsletter_subscribe(text, text, text) to service_role;
grant execute on function public.newsletter_confirm(uuid) to service_role;
grant execute on function public.newsletter_unsubscribe(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Fabric samples (up to shop_settings.sample_limit per request)

create table public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(btrim(customer_name)) between 2 and 120),
  customer_email text not null check (customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone text,
  postcode text not null,
  shipping_address text not null check (length(btrim(shipping_address)) between 5 and 400),
  status text not null default 'pending' check (status in ('pending', 'posted', 'cancelled')),
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  visitor_id uuid,
  session_id uuid,
  customer_ip text,
  customer_user_agent text,
  is_test boolean not null default false
);

create index sample_requests_status_idx on public.sample_requests (status, created_at desc);

create table public.sample_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.sample_requests (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  material_code text not null,
  material_name text not null,
  material_collection text not null,
  constraint sample_request_items_one_each unique (request_id, material_code)
);

create index sample_request_items_material_idx on public.sample_request_items (material_id)
  where material_id is not null;

-- The rule that cannot be talked out of, whichever route writes the rows.
create or replace function public.enforce_sample_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  select sample_limit into v_limit from public.shop_settings where id;
  if (select count(*) from public.sample_request_items where request_id = new.request_id) > v_limit then
    raise exception 'SAMPLE_LIMIT: at most % samples per request', v_limit using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_sample_limit() from public, anon, authenticated;

create constraint trigger sample_limit
  after insert on public.sample_request_items
  deferrable initially immediate
  for each row execute function public.enforce_sample_limit();

create or replace function public.request_samples(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_limit integer;
  v_found integer;
  v_id uuid;
  v_postcode text := public.normalise_postcode(p_input->>'postcode');
begin
  select array_agg(distinct public.try_uuid(x))
  into v_ids
  from jsonb_array_elements_text(coalesce(p_input->'material_ids', '[]'::jsonb)) as x
  where public.try_uuid(x) is not null;

  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'NO_SAMPLES' using errcode = 'check_violation';
  end if;

  select sample_limit into v_limit from public.shop_settings where id;
  if array_length(v_ids, 1) > v_limit then
    raise exception 'SAMPLE_LIMIT: at most % samples per request', v_limit using errcode = 'check_violation';
  end if;

  select count(*) into v_found
  from public.materials m
  join public.material_collections c on c.id = m.collection_id
  where m.id = any (v_ids) and m.is_active and m.is_swatchable and c.is_active;

  if v_found <> array_length(v_ids, 1) then
    raise exception 'UNAVAILABLE_MATERIAL' using errcode = 'check_violation';
  end if;

  if (public.classify_postcode(v_postcode))->>'kind' = 'invalid' then
    raise exception 'INVALID_POSTCODE' using errcode = 'check_violation';
  end if;

  insert into public.sample_requests (
    customer_name, customer_email, customer_phone, postcode, shipping_address,
    visitor_id, session_id, customer_ip, customer_user_agent, is_test
  )
  values (
    public.clean_text(p_input->>'customer_name', 120),
    lower(public.clean_text(p_input->>'customer_email', 254)),
    public.clean_text(p_input->>'customer_phone', 30),
    v_postcode,
    public.clean_text(p_input->>'shipping_address', 400),
    public.try_uuid(p_input->>'visitor_id'),
    public.try_uuid(p_input->>'session_id'),
    public.clean_text(p_input->>'customer_ip', 64),
    public.clean_text(p_input->>'customer_user_agent', 400),
    coalesce((p_input->>'is_test')::boolean, false)
  )
  returning id into v_id;

  insert into public.sample_request_items (request_id, material_id, material_code, material_name, material_collection)
  select v_id, m.id, m.code, m.name, c.name
  from public.materials m
  join public.material_collections c on c.id = m.collection_id
  where m.id = any (v_ids);

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function public.request_samples(jsonb) from public, anon, authenticated;
grant execute on function public.request_samples(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Reviews
--
-- Only from real orders (a signed link per delivered order and product), only
-- shown once approved. Nothing is imported from anywhere else.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  customer_name text not null check (length(btrim(customer_name)) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  title text check (title is null or length(title) <= 120),
  comment text check (comment is null or length(comment) <= 2000),
  image_url text,
  is_approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index reviews_one_per_order_product on public.reviews (order_id, product_id)
  where order_id is not null;
create index reviews_product_approved_idx on public.reviews (product_id, created_at desc) where is_approved;

create or replace function public.refresh_product_review_stats(p_product_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products p
  set review_count = coalesce(s.cnt, 0),
      average_rating = coalesce(s.avg_rating, 0)
  from (
    select count(*) as cnt, round(avg(rating)::numeric, 2) as avg_rating
    from public.reviews
    where product_id = p_product_id and is_approved
  ) s
  where p.id = p_product_id;
$$;

create or replace function public.reviews_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_review_stats(old.product_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.refresh_product_review_stats(old.product_id);
  end if;
  perform public.refresh_product_review_stats(new.product_id);
  return new;
end;
$$;

revoke all on function public.refresh_product_review_stats(uuid) from public, anon, authenticated;
revoke all on function public.reviews_stats_trigger() from public, anon, authenticated;

create trigger reviews_stats
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_stats_trigger();

-- ---------------------------------------------------------------------------
-- Automatic ad-visitor offer
--
-- A visitor arriving from a paid ad gets the offer for shop_settings.paid_offer_days
-- after their latest qualifying click. The token is authority only while it
-- exists here, unrevoked and unexpired.

create table public.offer_entitlements (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  visitor_id uuid not null unique,
  source text not null check (source in ('google_ads', 'meta_ads', 'meta_catalog')),
  qualifying_arrival_id uuid,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_entitlements_expiry_after_start check (expires_at > started_at)
);

create or replace function public.issue_paid_offer_entitlement(
  p_visitor_id uuid,
  p_source text,
  p_arrival_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_days integer;
  v_row public.offer_entitlements%rowtype;
begin
  if p_visitor_id is null then
    raise exception 'VISITOR_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_source is null or p_source not in ('google_ads', 'meta_ads', 'meta_catalog') then
    raise exception 'INVALID_OFFER_SOURCE' using errcode = 'check_violation';
  end if;

  select paid_offer_days into v_days from public.shop_settings where id;

  -- A fresh click while the offer is live keeps the token and start (so a
  -- dismissed prompt stays dismissed) and slides the expiry. The strongest
  -- source is kept: meta_ads, then google_ads, then a catalogue visit.
  insert into public.offer_entitlements as e (
    token, visitor_id, source, qualifying_arrival_id, started_at, expires_at, revoked_at, updated_at
  )
  values (
    gen_random_uuid(), p_visitor_id, p_source, p_arrival_id,
    v_now, v_now + make_interval(days => v_days), null, v_now
  )
  on conflict (visitor_id) do update
  set token = case when e.revoked_at is null and e.expires_at > v_now then e.token else gen_random_uuid() end,
      source = case
        when e.revoked_at is not null or e.expires_at <= v_now then excluded.source
        when e.source = 'meta_ads' or excluded.source = 'meta_ads' then 'meta_ads'
        when e.source = 'google_ads' or excluded.source = 'google_ads' then 'google_ads'
        else 'meta_catalog'
      end,
      qualifying_arrival_id = case
        when e.revoked_at is not null or e.expires_at <= v_now then excluded.qualifying_arrival_id
        when e.source = 'meta_ads' or (e.source = 'google_ads' and excluded.source = 'meta_catalog')
          then e.qualifying_arrival_id
        when excluded.source = 'meta_ads' or (excluded.source = 'google_ads' and e.source = 'meta_catalog')
          then excluded.qualifying_arrival_id
        else coalesce(e.qualifying_arrival_id, excluded.qualifying_arrival_id)
      end,
      started_at = case when e.revoked_at is null and e.expires_at > v_now then e.started_at else v_now end,
      expires_at = v_now + make_interval(days => v_days),
      revoked_at = null,
      updated_at = v_now
  returning * into v_row;

  return jsonb_build_object(
    'token', v_row.token,
    'source', v_row.source,
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at
  );
end;
$$;

revoke all on function public.issue_paid_offer_entitlement(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.issue_paid_offer_entitlement(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row level security

alter table public.attribution_sessions enable row level security;
alter table public.attribution_actions enable row level security;
alter table public.whatsapp_enquiries enable row level security;
alter table public.basket_reminder_leads enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.sample_requests enable row level security;
alter table public.sample_request_items enable row level security;
alter table public.reviews enable row level security;
alter table public.offer_entitlements enable row level security;

revoke all on table
  public.attribution_sessions, public.attribution_actions, public.whatsapp_enquiries,
  public.basket_reminder_leads, public.newsletter_subscribers, public.sample_requests,
  public.sample_request_items, public.reviews, public.offer_entitlements
from anon, authenticated;

grant select on table
  public.attribution_sessions, public.attribution_actions, public.whatsapp_enquiries,
  public.basket_reminder_leads, public.newsletter_subscribers, public.sample_requests,
  public.sample_request_items, public.offer_entitlements
to authenticated;

-- Reviews: approved ones are public; admins see and moderate all.
grant select on table public.reviews to anon, authenticated;
grant update, delete on table public.reviews to authenticated;

create policy "admins read attribution sessions" on public.attribution_sessions for select to authenticated
  using ((select public.is_admin()));
create policy "admins read attribution actions" on public.attribution_actions for select to authenticated
  using ((select public.is_admin()));
create policy "admins read whatsapp enquiries" on public.whatsapp_enquiries for select to authenticated
  using ((select public.is_admin()));
create policy "admins read basket reminders" on public.basket_reminder_leads for select to authenticated
  using ((select public.is_admin()));
create policy "admins read subscribers" on public.newsletter_subscribers for select to authenticated
  using ((select public.is_admin()));
create policy "admins read sample requests" on public.sample_requests for select to authenticated
  using ((select public.is_admin()));
create policy "admins read sample request items" on public.sample_request_items for select to authenticated
  using ((select public.is_admin()));
create policy "admins read offer entitlements" on public.offer_entitlements for select to authenticated
  using ((select public.is_admin()));

create policy "read approved reviews" on public.reviews for select to anon, authenticated
  using (is_approved or (select public.is_admin()));
create policy "admins moderate reviews" on public.reviews for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete reviews" on public.reviews for delete to authenticated
  using ((select public.is_admin()));

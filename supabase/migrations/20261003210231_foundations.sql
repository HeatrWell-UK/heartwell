-- Heartwell database foundations.
--
-- Extensions, the small helpers every later migration uses, the admin
-- allowlist, the shop settings that every price and promise reads, and the
-- two operational logs (scheduled job runs and email) that make a failure
-- visible instead of silent.
--
-- Conventions for every Heartwell migration:
--   * Row level security on every table. anon and authenticated get only the
--     grants a page actually needs; everything else goes through SECURITY
--     DEFINER functions or the server's secret key.
--   * Functions run with an empty search_path and name every object in full.
--   * Money is numeric(10,2), times are timestamptz, UK dates are worked out
--     in Europe/London.

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;
-- supabase_vault is installed on every Supabase project already.

-- ---------------------------------------------------------------------------
-- Helpers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- An unambiguous upper-case code (no 0/O, 1/I), from cryptographic random
-- bytes. 32 symbols divide 256 evenly, so every symbol is equally likely.
create or replace function public.random_code(p_length integer)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(r.b, i) % 32), 1),
           '' order by i)
  from (select extensions.gen_random_bytes(greatest(1, least(p_length, 32))) as b) r,
       generate_series(0, greatest(1, least(p_length, 32)) - 1) as i;
$$;

-- "m11ae" -> "M1 1AE". Must match normalisePostcode() in src/lib/delivery/postcode.ts.
create or replace function public.normalise_postcode(p_raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when length(c) < 5 then c else left(c, length(c) - 3) || ' ' || right(c, 3) end
  from (select upper(regexp_replace(coalesce(p_raw, ''), '\s+', '', 'g')) as c) s;
$$;

-- The last UK postcode in a block of address text, normalised, or null.
create or replace function public.postcode_from_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select public.normalise_postcode(m[1])
  from regexp_matches(
         upper(coalesce(p_text, '')),
         '([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})',
         'g') with ordinality as t(m, ord)
  order by ord desc
  limit 1;
$$;

-- A uuid from untrusted text, or null when it isn't one.
create or replace function public.try_uuid(p_text text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_text::uuid
    else null
  end;
$$;

-- Untrusted text, trimmed, capped and empty-as-null.
create or replace function public.clean_text(p_text text, p_max integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(btrim(coalesce(p_text, '')), p_max), '');
$$;

-- ---------------------------------------------------------------------------
-- Admins
--
-- An allowlist by email. A signed-in user becomes an admin only after
-- claim_admin() links their confirmed account to an allowlisted address, and
-- is_admin() then checks the link by user id, never by a claim in the token.

create table public.admins (
  email text primary key
    check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_id uuid unique references auth.users (id) on delete set null,
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

comment on table public.admins is
  'Who may use /admin. Add an email here; the person signs in and claim_admin() links their account.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = (select auth.uid())
      and a.is_active
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create or replace function public.claim_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return false;
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid
    and u.email_confirmed_at is not null;

  if v_email is null then
    return false;
  end if;

  update public.admins
  set user_id = v_uid,
      claimed_at = coalesce(claimed_at, now())
  where email = v_email
    and is_active
    and (user_id is null or user_id = v_uid);

  return public.is_admin();
end;
$$;

revoke all on function public.claim_admin() from public, anon;
grant execute on function public.claim_admin() to authenticated, service_role;

alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;
grant select on table public.admins to authenticated;

create policy "admins can see the admin list"
  on public.admins for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Shop settings
--
-- One row. Delivery prices, the delivery and preferred-date windows, offer tier
-- amounts and the sample limit live here and nowhere else: the database
-- functions price orders from it and the website displays from it, so a change
-- in the admin changes both at once.

create table public.shop_settings (
  id boolean primary key default true check (id),

  -- Delivery to a UK Mainland ground floor is free. These are the extras.
  upstairs_first_floor numeric(10,2) not null default 20 check (upstairs_first_floor >= 0),
  upstairs_per_extra_floor numeric(10,2) not null default 10 check (upstairs_per_extra_floor >= 0),
  max_floor smallint not null default 20 check (max_floor between 1 and 50),
  assembly_fee numeric(10,2) not null default 20 check (assembly_fee >= 0),
  removal_per_seat numeric(10,2) not null default 10 check (removal_per_seat >= 0),
  removal_min_seats smallint not null default 1 check (removal_min_seats >= 1),
  removal_max_seats smallint not null default 10,
  removal_default_seats smallint not null default 3,

  -- The promised window, in working days after the order is placed.
  delivery_min_working_days smallint not null default 2 check (delivery_min_working_days >= 0),
  delivery_max_working_days smallint not null default 4,

  -- The day a customer may ask for at checkout: from today + min to today + max.
  preferred_date_min_days smallint not null default 4 check (preferred_date_min_days >= 0),
  preferred_date_max_days smallint not null default 180,

  -- Offer tiers: the amount off for an order whose best item is in that tier.
  offer_tier_high numeric(10,2) not null default 50 check (offer_tier_high >= 0),
  offer_tier_mid numeric(10,2) not null default 30 check (offer_tier_mid >= 0),
  offer_tier_standard numeric(10,2) not null default 20 check (offer_tier_standard >= 0),
  -- How long the automatic ad-visitor offer lasts after the latest ad click.
  paid_offer_days smallint not null default 7 check (paid_offer_days between 1 and 60),

  -- Fabric samples per request.
  sample_limit smallint not null default 5 check (sample_limit between 1 and 20),

  -- Integrations, off until configured.
  orderflow_enabled boolean not null default false,

  updated_at timestamptz not null default now(),

  constraint shop_settings_removal_range check (
    removal_min_seats <= removal_default_seats and removal_default_seats <= removal_max_seats
  ),
  constraint shop_settings_delivery_window check (delivery_min_working_days <= delivery_max_working_days),
  constraint shop_settings_preferred_window check (preferred_date_min_days <= preferred_date_max_days)
);

insert into public.shop_settings default values;

create trigger shop_settings_updated_at
  before update on public.shop_settings
  for each row execute function public.set_updated_at();

alter table public.shop_settings enable row level security;
revoke all on table public.shop_settings from anon, authenticated;
grant select on table public.shop_settings to anon, authenticated;
grant update on table public.shop_settings to authenticated;

create policy "anyone can read the shop settings"
  on public.shop_settings for select to anon, authenticated
  using (true);

create policy "admins can change the shop settings"
  on public.shop_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Operational logs

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null check (job ~ '^[a-z][a-z0-9_-]{2,60}$'),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'failed', 'skipped')),
  detail jsonb,
  error text
);

comment on table public.job_runs is
  'One row per run of a scheduled job. The admin Health card shows the latest run of each.';

create index job_runs_job_started_idx on public.job_runs (job, started_at desc);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{2,60}$'),
  order_id uuid,
  recipient text not null,
  -- Set when a staging email was redirected to the owner's test inbox.
  intended_recipient text,
  subject text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error text
);

comment on table public.email_log is
  'Every email the site tries to send, with the outcome. Repeated failures raise an alert.';

create index email_log_created_idx on public.email_log (created_at desc);
create index email_log_status_idx on public.email_log (status, created_at desc);

alter table public.job_runs enable row level security;
alter table public.email_log enable row level security;
revoke all on table public.job_runs, public.email_log from anon, authenticated;
grant select on table public.job_runs, public.email_log to authenticated;

create policy "admins can read job runs"
  on public.job_runs for select to authenticated
  using ((select public.is_admin()));

create policy "admins can read the email log"
  on public.email_log for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Health

-- Cheap liveness probe for /api/health. Touches no table.
create or replace function public.health_ping()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('ok', true, 'time', now());
$$;

revoke all on function public.health_ping() from public;
grant execute on function public.health_ping() to anon, authenticated, service_role;

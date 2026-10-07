-- Phase 15: the Heartwell offer code, a switch for the automatic ad-visitor
-- offer, and a record of who fetches the catalogue feeds and when.

-- ---------------------------------------------------------------------------
-- The public offer code (decision D6). Admin → Settings can pause it, delete
-- it or add others; the shop shows ad visitors the newest live one.
-- ---------------------------------------------------------------------------
insert into public.offer_codes (code, label, is_active)
values ('HEARTSOFA', 'Heartwell offer code', true)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- The automatic offer for visitors from an ad. Switching it off stops new
-- offers; offers already given still apply until their date, as promised.
-- ---------------------------------------------------------------------------
alter table public.shop_settings add column paid_offer_enabled boolean not null default true;

-- ---------------------------------------------------------------------------
-- Feed fetches: one row per feed and fetcher, so the admin can say when Meta
-- last read the catalogue. Bounded (at most six rows), written by the website
-- with the server key.
-- ---------------------------------------------------------------------------
create table public.feed_fetches (
  feed text not null check (feed in ('meta', 'google')),
  agent text not null check (agent in ('meta', 'google', 'other')),
  first_fetched_at timestamptz not null default now(),
  last_fetched_at timestamptz not null default now(),
  fetch_count integer not null default 1,
  last_items integer not null default 0 check (last_items >= 0),
  primary key (feed, agent)
);

alter table public.feed_fetches enable row level security;
revoke all on public.feed_fetches from public, anon, authenticated;
grant select on public.feed_fetches to authenticated;
grant select, insert, update on public.feed_fetches to service_role;

create policy "admins read feed fetches" on public.feed_fetches for select to authenticated
  using ((select public.is_admin()));

create function public.record_feed_fetch(p_feed text, p_agent text, p_items integer)
returns void
language sql
set search_path = ''
as $$
  insert into public.feed_fetches as f (feed, agent, last_items)
  values (p_feed, p_agent, greatest(coalesce(p_items, 0), 0))
  on conflict (feed, agent) do update
  set last_fetched_at = now(),
      fetch_count = f.fetch_count + 1,
      last_items = excluded.last_items;
$$;

revoke all on function public.record_feed_fetch(text, text, integer) from public, anon, authenticated;
grant execute on function public.record_feed_fetch(text, text, integer) to service_role;

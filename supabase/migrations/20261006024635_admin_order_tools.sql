-- Admin order tools (Phase 11): delete a test order, record where an order
-- really came from, and add a staff note. Each checks is_admin() itself and
-- lives in the private schema behind a thin public wrapper, like the other
-- staff functions, so Supabase's security advisor stays clean.

-- Only test orders can be deleted. Real orders are cancelled, never removed,
-- so their history and any conversion already sent stay accountable.
create function private.delete_test_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref text;
begin
  perform public.require_admin();

  delete from public.orders where id = p_order_id and is_test returning reference into v_ref;
  if v_ref is null then
    if exists (select 1 from public.orders where id = p_order_id) then
      raise exception 'NOT_A_TEST_ORDER' using errcode = 'check_violation';
    end if;
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  return jsonb_build_object('reference', v_ref);
end;
$$;

-- Where an order really came from, when staff know better than the tracking
-- (a WhatsApp chat that started from an ad, a friend's recommendation).
create function private.set_order_attribution(p_order_id uuid, p_source text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := nullif(btrim(coalesce(p_source, '')), '');
  v_note text := public.clean_text(p_note, 300);
begin
  perform public.require_admin();

  if v_source is not null and v_source not in ('meta', 'google', 'direct', 'referral', 'other') then
    raise exception 'BAD_SOURCE: %', v_source using errcode = 'check_violation';
  end if;

  update public.orders
  set manual_acquisition_source = v_source,
      manual_acquisition_note = case when v_source is null then null else v_note end,
      manual_acquisition_at = case when v_source is null then null else now() end
  where id = p_order_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  insert into public.order_events (order_id, kind, actor, note)
  values (p_order_id, 'note', auth.uid(),
          case when v_source is null then 'Source override cleared'
               else 'Source set to ' || v_source || coalesce(': ' || v_note, '') end);
end;
$$;

-- A note on the order's history: what was agreed on the phone, a delivery slot.
create function private.add_order_note(p_order_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := public.clean_text(p_note, 1000);
begin
  perform public.require_admin();

  if v_note is null then
    raise exception 'EMPTY_NOTE' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  insert into public.order_events (order_id, kind, actor, note) values (p_order_id, 'note', auth.uid(), v_note);
end;
$$;

create function public.delete_test_order(p_order_id uuid)
returns jsonb language sql set search_path = ''
as $$ select private.delete_test_order(p_order_id) $$;

create function public.set_order_attribution(p_order_id uuid, p_source text, p_note text default null)
returns void language sql set search_path = ''
as $$ select private.set_order_attribution(p_order_id, p_source, p_note) $$;

create function public.add_order_note(p_order_id uuid, p_note text)
returns void language sql set search_path = ''
as $$ select private.add_order_note(p_order_id, p_note) $$;

revoke all on function
  private.delete_test_order(uuid), private.set_order_attribution(uuid, text, text), private.add_order_note(uuid, text),
  public.delete_test_order(uuid), public.set_order_attribution(uuid, text, text), public.add_order_note(uuid, text)
from public, anon;

grant execute on function
  private.delete_test_order(uuid), private.set_order_attribution(uuid, text, text), private.add_order_note(uuid, text),
  public.delete_test_order(uuid), public.set_order_attribution(uuid, text, text), public.add_order_note(uuid, text)
to authenticated, service_role;

-- Keep SECURITY DEFINER functions out of the exposed API schema.
--
-- Functions that run with the owner's rights live in `private`, which the
-- Data API does not expose. Where a page or the admin needs to call one, a
-- thin SECURITY INVOKER wrapper in `public` forwards the call, and only the
-- roles that need it may execute the wrapper.
--
-- Row level security policies refer to functions by identity, not by name, so
-- moving is_admin() leaves every policy calling the same function.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_admin() set schema private;
alter function public.claim_admin() set schema private;
alter function public.admin_status() set schema private;
alter function public.confirm_order(uuid) set schema private;
alter function public.order_for_confirmation(uuid) set schema private;
alter function public.track_order(text, text) set schema private;
alter function public.place_manual_order(jsonb) set schema private;
alter function public.update_order_details(uuid, jsonb) set schema private;
alter function public.set_order_status(uuid, text, text) set schema private;
alter function public.set_order_test(uuid, boolean, text) set schema private;

-- ---------------------------------------------------------------------------
-- Public wrappers

create function public.is_admin()
returns boolean language sql stable set search_path = ''
as $$ select private.is_admin() $$;

create function public.claim_admin()
returns boolean language sql set search_path = ''
as $$ select private.claim_admin() $$;

create function public.admin_status()
returns jsonb language sql stable set search_path = ''
as $$ select private.admin_status() $$;

create function public.confirm_order(p_order_id uuid)
returns jsonb language sql set search_path = ''
as $$ select private.confirm_order(p_order_id) $$;

create function public.order_for_confirmation(p_order_id uuid)
returns jsonb language sql stable set search_path = ''
as $$ select private.order_for_confirmation(p_order_id) $$;

create function public.track_order(p_reference text, p_postcode text)
returns jsonb language sql stable set search_path = ''
as $$ select private.track_order(p_reference, p_postcode) $$;

create function public.place_manual_order(p_input jsonb)
returns jsonb language sql set search_path = ''
as $$ select private.place_manual_order(p_input) $$;

create function public.update_order_details(p_order_id uuid, p_input jsonb)
returns jsonb language sql set search_path = ''
as $$ select private.update_order_details(p_order_id, p_input) $$;

create function public.set_order_status(p_order_id uuid, p_status text, p_reason text default null)
returns jsonb language sql set search_path = ''
as $$ select private.set_order_status(p_order_id, p_status, p_reason) $$;

create function public.set_order_test(p_order_id uuid, p_is_test boolean, p_reason text default null)
returns void language sql set search_path = ''
as $$ select private.set_order_test(p_order_id, p_is_test, p_reason) $$;

-- ---------------------------------------------------------------------------
-- Who may call what

revoke all on all functions in schema private from public;

-- is_admin() is evaluated inside row level security for every visitor.
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- The customer's confirm link and the tracking page.
grant execute on function private.confirm_order(uuid) to anon, authenticated, service_role;
grant execute on function private.order_for_confirmation(uuid) to anon, authenticated, service_role;
grant execute on function private.track_order(text, text) to anon, authenticated, service_role;
revoke all on function public.confirm_order(uuid), public.order_for_confirmation(uuid),
  public.track_order(text, text) from public;
grant execute on function public.confirm_order(uuid), public.order_for_confirmation(uuid),
  public.track_order(text, text) to anon, authenticated, service_role;

-- Signed-in admins (each function checks is_admin() itself).
grant execute on function
  private.claim_admin(), private.admin_status(), private.place_manual_order(jsonb),
  private.update_order_details(uuid, jsonb), private.set_order_status(uuid, text, text),
  private.set_order_test(uuid, boolean, text)
to authenticated, service_role;
revoke all on function
  public.claim_admin(), public.admin_status(), public.place_manual_order(jsonb),
  public.update_order_details(uuid, jsonb), public.set_order_status(uuid, text, text),
  public.set_order_test(uuid, boolean, text)
from public;
grant execute on function
  public.claim_admin(), public.admin_status(), public.place_manual_order(jsonb),
  public.update_order_details(uuid, jsonb), public.set_order_status(uuid, text, text),
  public.set_order_test(uuid, boolean, text)
to authenticated, service_role;

-- orderflow.push_log is reached only through orderflow's own functions.
create policy "no direct access" on orderflow.push_log for select to authenticated using (false);

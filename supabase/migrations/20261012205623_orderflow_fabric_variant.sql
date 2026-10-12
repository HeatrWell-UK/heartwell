-- Phase 17: a made-to-order line tells OrderFlow the whole fabric, as the shop
-- and the emails show it ("Blue, Plush Soft Velvet (PL09)"), not just its
-- colour, so the warehouse knows exactly what to make.

create or replace function orderflow.order_payload(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'external_id', o.id::text,
    'reference', case when o.is_test then 'TEST ' else '' end || o.reference,
    'shop', 'heartwell',
    'status', o.status,
    'placed_at', to_char(o.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'postcode', o.postcode,
    'delivery_date', to_char(o.preferred_delivery_date, 'YYYY-MM-DD'),
    'total', round(o.total_amount, 2),
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               -- The warehouse knows the trade name; a staff-typed name wins.
               'product_name', coalesce(oi.custom_title, oi.trade_title, oi.title),
               'sku', oi.sku,
               'variant', case
                 when oi.material_name is not null then
                   oi.material_name
                   || coalesce(', ' || oi.material_collection, '')
                   || coalesce(' (' || oi.material_code || ')', '')
                 else oi.colour_name
               end,
               'quantity', oi.quantity,
               'unit_price', round(oi.unit_price, 2)
             )) order by oi.position, oi.created_at, oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  ))
  from public.orders o
  where o.id = p_order_id;
$$;

revoke all on function orderflow.order_payload(uuid) from public, anon, authenticated;

# OrderFlow

Heartwell sends its orders to OrderFlow from inside its own database: no website code and no secret in the hosting settings. It's built and tested, and it does nothing until the two values below are in Supabase Vault and you switch it on.

## What's sent, and when

- **When:** when an order is placed (at the moment the order and its items are saved together, so the items are never missing) and every time its status, delivery day, total or items change. Every 15 minutes, any order changed in the last 3 days that OrderFlow hasn't accepted since its last change is sent again.
- **What:** the JSON below. Never the customer's name, phone, email or address.
- **Which orders:** real orders only. Test orders (staging, staff devices, `?qa=1`, test details) are never sent automatically. You can send one by hand to check the link; it arrives with **TEST** in front of its reference.
- **A sale never fails because of OrderFlow:** every send is wrapped so an error becomes a warning, and with the Vault values missing nothing happens at all.
- **You can see every reply:** Admin → Settings → OrderFlow lists the latest sends with OrderFlow's answer ("created", "updated", or why it refused), each order's page shows its own, and the Status page turns red (and emails you) if orders aren't being accepted.

## Your steps

1. Get a **fresh key** from OrderFlow. (The one pasted into our chat on 13 October 2026 has been in a chat transcript; a new one costs nothing.)
2. In Supabase, open **heartwell-prod** → **Project Settings** → **Vault** → **Add new secret**, twice:
   - Name `orderflow_ingest_url`, value: OrderFlow's address (`https://<their project>.supabase.co/functions/v1/ingest-order`).
   - Name `orderflow_ingest_key`, value: the key (`ofw_live_…`).
3. To test before launch, add the same two secrets to **heartwell-staging** too. Staging only ever sends orders by hand, marked TEST.
4. In the admin (staging): **Settings → OrderFlow → Send test order**. It should say "OrderFlow accepted it (created)". Check it in OrderFlow, then delete it there.
5. At go-live (Phase 19, production admin): **Settings → OrderFlow → Switch on**.

Never put the key in a file, a message or the hosting settings: Vault only. The repository's leak check refuses anything that looks like an OrderFlow key.

## For OrderFlow (what they asked for)

**Status values** (sent exactly as written):

| Status | Meaning |
| --- | --- |
| `pending_cod` | Placed online, waiting for the customer to tap Confirm (not a firm order yet) |
| `confirmed` | Confirmed by the customer (or by staff for a phone or WhatsApp order) |
| `processing` | Being prepared, or being made for a made-to-order piece |
| `shipped` | Out for delivery |
| `delivered` | Delivered and paid |
| `cancelled` | Cancelled |

**Sample order** (a real staging order; no customer fields exist in the payload):

```json
{
  "external_id": "3547044a-3cee-407a-bd1b-f06a075e663f",
  "reference": "HW-100107",
  "shop": "heartwell",
  "status": "confirmed",
  "placed_at": "2026-10-07T21:03:14Z",
  "postcode": "LS6 2AB",
  "total": 280.00,
  "items": [
    { "product_name": "Roma Recliner Armchair Manual Sofa", "sku": "RRA-G", "variant": "Grey", "quantity": 1, "unit_price": 280.00 }
  ]
}
```

Notes for their mapping:

- `reference` is always `HW-` and the order number, which tells Heartwell orders apart from the other shop's. `shop` says the same and can be ignored.
- `delivery_date` (yyyy-MM-dd) is the customer's preferred day when they chose one; it's left out otherwise. There's no delivery slot.
- `variant` is the colour, or for a made-to-order piece the chosen fabric with its collection and code, e.g. `Blue, Plush Soft Velvet (PL09)`.
- `product_name` is the warehouse's trade name where one is set, otherwise the shop's name for the piece.
- `total` includes any delivery extras (upstairs, assembly, removal) and is after any offer; `unit_price` is per piece.

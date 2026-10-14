# Monitoring, alerts and the Monday digest

Nothing should fail quietly. Three layers watch the shop:

| Layer | What it catches | Where you hear about it |
| --- | --- | --- |
| **Admin → Status** (the Health card) | Database, server key, email, scheduled jobs, Meta and Google tracking, the catalogue feed, OrderFlow, address lookup, photo uploads | Green, amber or red, each with a reason |
| **Hourly health check** (pg_cron → the website) | Anything on the Health card that turns **red** | An email to the shop inbox (and the copy address): once when it breaks, again a day later if it's still broken, and once when it's fixed |
| **UptimeRobot** (outside, free) | The site or database down, the hourly check stopped, or anything red, **including email itself being broken** | UptimeRobot's own email and phone app |

The alert email uses the same verdicts as the Health card, so they can never disagree. Before go-live the subject starts with `[pre-launch]`.

## The Monday digest

Every Monday at 7am (8am in summer time) the shop inbox gets last week, Monday to Sunday:

- orders confirmed and their value, against the week before; placed, delivered, cancelled, and how many are waiting for the customer to confirm;
- where confirmed orders came from: Meta ads (campaign and ad), Google ads, WhatsApp, phone, other links or direct;
- visits (and how many from Meta ads), WhatsApp enquiries, sample requests, contact messages, basket reminders, newsletter sign-ups;
- the top landing pages, with how many orders each led to.

Real orders only: test orders, staff devices and `?qa=1` visits are left out.

## UptimeRobot (decision D8): your steps, at go-live

1. Create a free account at uptimerobot.com and install its phone app.
2. **Add New Monitor** → type **HTTP(s)**, name "Heartwell site", URL `https://heartwellsofa.co.uk/api/health`, every 5 minutes. It goes red if the site or its database stops answering.
3. **Add New Monitor** → type **HTTP(s)**, name "Heartwell checks", URL `https://heartwellsofa.co.uk/api/health/checks`, every 5 minutes. It goes red (HTTP 503) when anything on the Health card is red, or when the hourly check has stopped for over two hours. It only says how many checks are red, never which.
4. Under **Alert contacts**, add your email and the phone app, and tick both monitors.

When "Heartwell checks" goes red, open Admin → Status to see why.

## Schedule (pg_cron, in each Supabase project)

| Job | When | Does |
| --- | --- | --- |
| `heartwell-conversions` | every 5 minutes | Sends due Meta and GA4 conversions |
| `heartwell-orderflow-resend` | every 15 minutes | Records OrderFlow's replies; re-sends orders it hasn't accepted |
| `heartwell-health-check` | hourly, at 7 past | The health check above |
| `heartwell-review-requests` | daily, 9am UTC | Review emails three days after delivery |
| `heartwell-daily-cleanup` | daily, 3:15am UTC | Deletes data past its keeping period (privacy notice) |
| `heartwell-monday-digest` | Mondays, 7am UTC | The Monday digest |

Conversions, the health check, review emails and the digest are done by the website (the database starts them), so they need the site's address in `private.app_config` (`site_url`). It's set to the site (heartwellfurniture.vercel.app) and changes at the move to Hostinger (Phase 18B) and at go-live.

# Google Merchant Center: delivery settings

Updated 17 October 2026 for the owner's delivery charges. The site's promise: **free delivery to most of mainland Britain in 2 to 4 working days; Devon and the Aberdeen area £40, Cornwall, the Scottish Highlands and Moray and North East Scotland £80, the far north of Scotland £100, all in 5 to 7 working days; no deliveries on Mondays; islands and Northern Ireland by quote, not online.** Merchant Center needs the same promise, by postcode.

**Where the lists come from:** the database's delivery areas (Admin → Settings → Delivery areas, migration `delivery_areas`), the same lists checkout charges by. If an area changes there, change the region here too (or ask me for fresh lists). The no-delivery list is the site's quote-only rule (`src/lib/delivery/postcode.ts`).

## 1. Delivery service

Merchant Center → Settings → **Shipping and returns** → Shipping → add a service:

| Setting | Value |
| --- | --- |
| Name | Heartwell delivery |
| Country | United Kingdom, GBP |
| Order cut-off and handling | a cut-off time you're happy with (for example 5pm), handling **0 days**, so Google's total matches the site's |
| Business days for transit | **Monday to Friday**: the site promises *working* days, so Google counts the same way |
| Transit time | **2 to 4 days** for everywhere, then by region below: the three charged regions **5 to 7 days** |
| Delivery cost | **Free** for everywhere, then by region below: **£40**, **£80**, **£100** |
| Region **No online delivery** | **No delivery** (these customers get a WhatsApp quote instead) |
| Minimum order value | **£399** (Phase 21, owner, 22 October 2026: website orders start at £399). Google then tells shoppers about the minimum on pieces priced under it (footstools, armchairs, some 2 seaters). Keep it the same as Admin → Settings → Minimum order. |

Google's help on the minimum: [Add a minimum order value](https://support.google.com/merchants/answer/14955659). The feed has no `shipping` attribute, which matters: a product's own `shipping` would cancel the account's minimum.

## 2. Regions

Make each list a region (Settings → Shipping and returns → **Regions** → by postcode), paste the codes, then give each region its cost and time in the service above. An outward code (such as `IV1`) covers every postcode in that district; `BT*` covers a whole area (if Merchant Center won't take the star, enter `BT`).

### Region 1: £40, 5 to 7 working days (88 codes)

Devon (Exeter, Plymouth, Torquay, Paignton, Newton Abbot, Tavistock, Ivybridge). Aberdeen area (Aberdeen, Stonehaven, Inverurie, Banchory, Ellon).

```
EX1
EX2
EX3
EX4
EX5
EX6
EX7
EX8
EX9
EX10
EX11
EX12
EX13
EX14
EX15
EX16
EX17
EX18
EX19
EX20
EX21
EX22
EX24
EX25
EX26
EX27
EX28
EX29
EX30
EX31
EX32
EX33
EX34
EX35
EX36
EX37
EX38
EX39
PL1
PL2
PL3
PL4
PL5
PL6
PL7
PL8
PL9
PL16
PL19
PL20
PL21
TQ1
TQ2
TQ3
TQ4
TQ5
TQ6
TQ7
TQ8
TQ9
TQ10
TQ11
TQ12
TQ13
TQ14
AB10
AB11
AB12
AB13
AB14
AB15
AB16
AB21
AB22
AB23
AB24
AB25
AB30
AB31
AB32
AB33
AB34
AB35
AB36
AB39
AB41
AB51
AB52
```

### Region 2: £80, 5 to 7 working days (106 codes)

Cornwall (Truro, Penzance, St Ives, Newquay, Bodmin, Liskeard, Bude). Scottish Highlands and Moray (Inverness, Nairn, Elgin, Aviemore, Fort William, Mallaig). North East Scotland (Peterhead, Fraserburgh, Banff, Turriff, Keith).

```
TR1
TR2
TR3
TR4
TR5
TR6
TR7
TR8
TR9
TR10
TR11
TR12
TR13
TR14
TR15
TR16
TR17
TR18
TR19
TR20
TR26
TR27
PL10
PL11
PL12
PL13
PL14
PL15
PL17
PL18
PL22
PL23
PL24
PL25
PL26
PL27
PL28
PL29
PL30
PL31
PL32
PL33
PL34
PL35
EX23
IV1
IV2
IV3
IV4
IV5
IV6
IV7
IV8
IV9
IV10
IV11
IV12
IV13
IV14
IV15
IV16
IV17
IV18
IV19
IV20
IV30
IV31
IV32
IV36
IV40
IV52
IV53
IV54
IV63
PH19
PH20
PH21
PH22
PH23
PH24
PH25
PH26
PH30
PH31
PH32
PH33
PH34
PH35
PH36
PH37
PH38
PH39
PH40
PH41
PH49
PH50
AB37
AB38
AB56
AB42
AB43
AB44
AB45
AB53
AB54
AB55
```

### Region 3: £100, 5 to 7 working days (21 codes)

Far north of Scotland (Thurso, Wick, Ullapool, Lairg, Gairloch (Caithness and Sutherland)).

```
KW1
KW2
KW3
KW5
KW6
KW7
KW8
KW9
KW10
KW11
KW12
KW13
KW14
IV21
IV22
IV23
IV24
IV25
IV26
IV27
IV28
```

### No online delivery: WhatsApp quote instead (72 codes)

Northern Ireland, the Isle of Man, the Channel Islands, the Scottish islands, the Isle of Wight and the Isles of Scilly.

```
BT*
IM*
JE*
GY*
HS*
ZE*
KW15
KW16
KW17
KA27
KA28
PA20
PA41
PA42
PA43
PA44
PA45
PA46
PA47
PA48
PA49
PA60
PA61
PA62
PA63
PA64
PA65
PA66
PA67
PA68
PA69
PA70
PA71
PA72
PA73
PA74
PA75
PA76
PA77
PA78
PH42
PH43
PH44
IV41
IV42
IV43
IV44
IV45
IV46
IV47
IV48
IV49
IV51
IV55
IV56
PO30
PO31
PO32
PO33
PO34
PO35
PO36
PO37
PO38
PO39
PO40
PO41
TR21
TR22
TR23
TR24
TR25
```

Two districts are part island, part mainland (IV40 includes Raasay, PA34 includes Easdale, Lismore and nearby islands). The site sorts them by the address at checkout; in Merchant Center IV40 is in Region 2 and PA34 is free.

## 3. Returns

Settings → Shipping and returns → **Returns** → add a policy for the United Kingdom: **14 days** from delivery, customer pays the return delivery, refund within 14 days of the item coming back, returns by arrangement (email or WhatsApp). Made-to-order pieces can't be returned for a change of mind (faults always can), as `/delivery-and-returns` says. Return policy link: `https://heartwellsofa.co.uk/delivery-and-returns`.

## 4. Products (the feed, on since Phase 20)

Feed address: **`https://heartwellsofa.co.uk/feeds/google-merchant.xml`** (also in Admin → Ad links, with when Google last fetched it).

Merchant Center → **Products** → **Add products** → **Add a file** → **Enter a link to your file**: paste the address, name it "Heartwell feed", country **United Kingdom**, language **English**, fetch **daily**. If Merchant Center already reads products from the website, keep the feed and remove the website source once the feed shows its products, so each product is listed once.

What's in it: one item per colourway that has its own photo (the same items as Meta's catalogue), priced from the database, with `identifier_exists: no` (made for us, no barcode), `item_group_id` and colour for the colourways of one product, measurements (`product_width`, `product_length`, `product_height`) and the product's highlights. There's no `shipping` in the feed: Merchant Center's delivery settings (sections 1 and 2) set it by postcode, which a feed can't. Search pages can't say it by postcode either (Google accepts postcodes in page data only for Australia, Canada and the US), so these settings are the one place Google learns the delivery charges and the 5 to 7 day areas.

After the first fetch, check **Products → Needs attention**. Common first-day notes and what to do: "Missing shipping information" (finish sections 1 and 2), "Missing return policy" (section 3), "Pending initial review" (wait 3 to 5 working days).

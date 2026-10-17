# Google Merchant Center: delivery settings

Written 17 October 2026 for the owner's Merchant Center set-up. The delivery promise on the site is **free UK Mainland delivery, 2 to 4 working days for most postcodes, 5 to 7 for some in the Scottish Highlands and the far south-west of England, seven days a week**. Merchant Center needs the same promise, by postcode.

**Where the lists come from:** the Highlands list is DPD's published "two day" mainland areas for Scotland, minus the island districts the site sends to a WhatsApp quote. The south-west list is Cornwall and Devon (owner: "lower England"). The no-delivery list is the site's own quote-only rule (`src/lib/delivery/postcode.ts`). **Check the two slower lists against what your delivery partner actually does** and tell me any changes: the site's wording and these lists should match.

## 1. Delivery service

Merchant Center → Settings → **Shipping and returns** → Shipping → add a service:

| Setting | Value |
| --- | --- |
| Name | Free UK Mainland delivery |
| Country | United Kingdom, GBP |
| Order cut-off and handling | a cut-off time you're happy with (for example 5pm), handling **0 days**, so Google's total matches the site's |
| Business days for transit | **Monday to Friday**: the site promises *working* days, so Google should count the same way (deliveries on other days only arrive sooner) |
| Transit time | **2 to 4 days** for everywhere, then by region (below): **Slower delivery** 5 to 7 days |
| Delivery cost | Free (£0) |
| Region **No online delivery** | No delivery (these customers get a WhatsApp quote instead) |

## 2. Regions

Make each list a region (Settings → Shipping and returns → **Regions** → by postcode), paste the codes, then pick the regions in the service above. Enter codes exactly as below: an outward code (such as `IV1`) covers every postcode in that district; `BT*` covers a whole area.

### Slower delivery: 5 to 7 working days (246 codes)

**Scottish Highlands (136):**

```
AB31, AB32, AB33, AB34, AB35, AB36, AB37, AB38, AB41, AB42, AB43, AB44, AB45, AB46, AB47, AB48, AB49, AB50, AB51, AB52, AB53, AB54, AB55, AB56, FK17, FK18, FK19, FK20, FK21, IV1, IV2, IV3, IV4, IV5, IV6, IV7, IV8, IV9, IV10, IV11, IV12, IV13, IV14, IV15, IV16, IV17, IV18, IV19, IV20, IV21, IV22, IV23, IV24, IV25, IV26, IV27, IV28, IV29, IV30, IV31, IV32, IV33, IV34, IV35, IV36, IV37, IV38, IV39, IV40, IV52, IV53, IV54, IV63, KW1, KW2, KW3, KW4, KW5, KW6, KW7, KW8, KW9, KW10, KW11, KW12, KW13, KW14, PA21, PA22, PA23, PA24, PA25, PA26, PA27, PA28, PA29, PA30, PA31, PA32, PA33, PA34, PA35, PA36, PA37, PA38, PA39, PA40, PH15, PH16, PH17, PH18, PH19, PH20, PH21, PH22, PH23, PH24, PH25, PH26, PH27, PH28, PH29, PH30, PH31, PH32, PH33, PH34, PH35, PH36, PH37, PH38, PH39, PH40, PH41, PH49, PH50
```

**Cornwall and Devon (110):**

```
TR1, TR2, TR3, TR4, TR5, TR6, TR7, TR8, TR9, TR10, TR11, TR12, TR13, TR14, TR15, TR16, TR17, TR18, TR19, TR20, TR26, TR27, PL1, PL2, PL3, PL4, PL5, PL6, PL7, PL8, PL9, PL10, PL11, PL12, PL13, PL14, PL15, PL16, PL17, PL18, PL19, PL20, PL21, PL22, PL23, PL24, PL25, PL26, PL27, PL28, PL29, PL30, PL31, PL32, PL33, PL34, PL35, TQ1, TQ2, TQ3, TQ4, TQ5, TQ6, TQ7, TQ8, TQ9, TQ10, TQ11, TQ12, TQ13, TQ14, EX1, EX2, EX3, EX4, EX5, EX6, EX7, EX8, EX9, EX10, EX11, EX12, EX13, EX14, EX15, EX16, EX17, EX18, EX19, EX20, EX21, EX22, EX23, EX24, EX25, EX26, EX27, EX28, EX29, EX30, EX31, EX32, EX33, EX34, EX35, EX36, EX37, EX38, EX39
```

### No online delivery: WhatsApp quote instead (72 codes)

Northern Ireland, the Isle of Man, the Channel Islands, the Scottish islands, the Isle of Wight and the Isles of Scilly:

```
BT*, IM*, JE*, GY*, HS*, ZE*, KW15, KW16, KW17, KA27, KA28, PA20, PA41, PA42, PA43, PA44, PA45, PA46, PA47, PA48, PA49, PA60, PA61, PA62, PA63, PA64, PA65, PA66, PA67, PA68, PA69, PA70, PA71, PA72, PA73, PA74, PA75, PA76, PA77, PA78, PH42, PH43, PH44, IV41, IV42, IV43, IV44, IV45, IV46, IV47, IV48, IV49, IV51, IV55, IV56, PO30, PO31, PO32, PO33, PO34, PO35, PO36, PO37, PO38, PO39, PO40, PO41, TR21, TR22, TR23, TR24, TR25
```

Two districts are part island, part mainland (IV40 includes Raasay, PA34 includes Easdale, Lismore and nearby islands). The site sorts them by the address at checkout; in Merchant Center they're in the slower list.

## 3. Returns

Settings → Shipping and returns → **Returns** → add a policy for the United Kingdom: **14 days** from delivery, customer pays the return delivery, refund within 14 days of the item coming back, returns by arrangement (email or WhatsApp). Made-to-order pieces can't be returned for a change of mind (faults always can), as `/delivery-and-returns` says. Return policy link: `https://heartwellsofa.co.uk/delivery-and-returns`.

## 4. Products

The site has a Google product feed built and switched off (`/feeds/google-merchant.xml`, Phase 20 switches it on). Until then Merchant Center can read the products from the site's own product data (Products → Add products → from your website). The feed is better once it's on: exact prices, colours and photos, refreshed daily.

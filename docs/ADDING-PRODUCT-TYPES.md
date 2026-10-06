# Adding a product type

Heartwell's catalogue isn't sofa-only. A new kind of product (a coffee table, a bed, a wardrobe) is **data entry in the admin, not code**. This guide walks through it, using a coffee table as the example.

Everything below is in the admin under **Catalogue → Types, categories, ranges and fabrics** (`/admin/catalogue/structure`), then **Catalogue → Add a product**.

## 1. Add the type

**Structure → Product types → Add a type.**

| Field | Coffee table example | What it does |
|---|---|---|
| Name / Plural | Coffee table / Coffee tables | How the admin names the type. |
| Short name | `coffee-table` | Fixed once saved. Used inside the system. |
| Specifications fields | Top (words: Oak, Glass, Marble), Frame (words), Shelves (number), Storage (yes/no) | What every product of this type records. Customers see them in the product page's **Specifications** panel, in this order. |
| Filters | Price, Colour, Width | Which filters its category pages offer (see below). |
| Materials customers can choose | none (or Wood, if tops can be ordered in other finishes) | Which fabric-library collections a **made-to-order** product of this type can be made in. |
| Taking the old one away | Per item | Recorded for checkout (see *Known limits*). |
| Google / Meta product category | `Furniture > Tables > Coffee Tables` | Used by the shopping feeds in Phase 15. Use Google's product taxonomy wording. |

### Specifications fields

Each field has a **label** (what customers read), a **key** (how it's stored, e.g. `top_material`; filled in from the label) and a **kind**:

- **Words**: free text, with suggestions from values already used. Add **fixed choices** (comma separated) to get a dropdown instead, which keeps spellings consistent.
- **Number**: e.g. seats, shelves, drawers.
- **Yes / no**: shown only when ticked (e.g. "USB ports: Yes").
- **Pieces (sets)**: a list of named pieces with their own sizes (3+2 sofa sets). One per type at most.

Renaming a key or removing a field never deletes data: existing products keep the stored value, it just stops showing until a field with that key returns.

### Filters

| Filter | Works for | Reads |
|---|---|---|
| Price, Colour, Width, Made to order | Any type | The product's price, colourway names, width and made-to-order tick. |
| Shape, Seats, Material, Reclining | Types with a field of that key | The Specifications field `shape`, `seats`, `material` or `reclining`. |

The form warns when a filter has no matching field. On a category page, filter choices that wouldn't narrow the list are left out.

## 2. Give it somewhere to live

**Structure → Categories → Add a category.** For example *Living room* (top level, so it becomes a department in the menu) with *Coffee tables* inside it. The menu, the footer, category pages, breadcrumbs and the sitemap are all built from this tree, and every shown category appears in the menu, so untick **Shown in the shop** on a new category until its products are ready.

Optional: **Structure → Ranges** if the coffee table comes in sizes or styles that should be offered as options of each other (name the options, e.g. *Size* and *Finish*).

## 3. Add the products

**Catalogue → Add a product**, choose the type, then fill in:

- **The basics**: name (the web address fills itself in), price, offer tier, range and options, trade name for the warehouse.
- **Where it shows**: main category, any other categories, shown/hidden, featured.
- **Size**: width, depth and height in centimetres (seat sizes and corner sides only for seating). The measurements drawing and "Will it fit?" use them.
- **Specifications**: the type's own fields.
- **Colourways**: one per colour you sell, each with the warehouse **SKU**, colour name and swatch, price difference and its photo. Every product needs at least one.
- **Photos**: extra gallery photos. Upload from your phone, paste a Cloudinary link, or pick one already in the catalogue.
- **Words**: description, highlights, search title and description.

Save, and the shop shows it on the next visit (the shop's cached pages are refreshed as you save). **Copy as a new product** on any product page starts the next size or colour with everything filled in except the SKUs.

Hide a product to take it off the shop without losing anything. Delete is only offered for products that have never been ordered; ordered ones can only be hidden so every order keeps its product.

## Known limits (wording still written for sofas)

These pieces of the shop still talk about sofas, whatever the type. They work, but read oddly for a coffee table:

- Checkout's take-away option ("Take my old sofa away", priced per seat) and the matching lines on the product page, basket and postcode check. The type's **Taking the old one away** setting is stored but checkout doesn't read it yet.
- "Will it fit?" explains that sofas go through a door on their side.
- The promises in `src/config/promises.ts` (frame guarantee, "fabric sofas made to order") and the empty-basket "Shop sofas" link.

When the first non-sofa product is ready to sell, ask for these to follow the product type (a small change: the wording reads the type's name and removal unit, and checkout hides take-away when nothing in the basket can be taken away).

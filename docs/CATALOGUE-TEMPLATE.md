# Your catalogue: how to fill in the spreadsheet

Open `docs/catalogue-template.csv` in Excel or Google Sheets. **One row per colour of each product.** Keep the header row. The three example rows show the format: replace them with your own.

| Column | What to put | Example |
| --- | --- | --- |
| range | The family a product belongs to (the same name on every size and style in it). Leave blank if it's on its own. | Example Range |
| product | The product's name as customers should see it. | Example 3 Seater High Back |
| product_type | `sofa`, `armchair` or `footstool` | sofa |
| size | The size within the range | 3 Seater, Corner, U-Shape, 3+2 Set, Armchair |
| back_style | Only if the range comes in back styles | High Back, Scatter Back |
| colour | The colour name customers see | Grey |
| sku | Your code for this exact product and colour (the warehouse and OrderFlow use it) | EX3HB-GRY |
| price_gbp | The product's price in pounds, delivery free | 549 |
| colour_extra_gbp | Extra for this colour, if any (otherwise 0) | 20 |
| width_cm, depth_cm, height_cm | Sizes in centimetres | 205, 95, 92 |
| side_a_cm, side_b_cm | Corner and U-shaped sofas only: the length of each side | 240, 200 |
| material | What the cover is (and for "leather", which kind: genuine, bonded or leather-look) | Velvet |
| made_to_order | `yes` if it's made after the order (customers can then choose any fabric) | yes |
| made_in_uk | `yes` only if it's made in the UK | yes |
| offer_tier | `high`, `mid`, `standard` or `none`: how much an offer takes off it | standard |
| categories | Where it shows, separated by `;`: corner-sofas, u-shaped-sofas, 3-2-sofa-sets, fabric-sofas, leather-sofas, recliners, electric-recliners, armchairs-and-footstools | corner-sofas;fabric-sofas |
| photos | The photo file names in your folder for this colour, first one is the main photo, separated by `;` | ex3hb-grey-1.jpg;ex3hb-grey-2.jpg |
| description | A few sentences about the product, on its first row only | |
| highlights | Short selling points, separated by `;`, on its first row only | High back;Solid wood frame |

Photos: square or portrait, at least 1200 pixels across, one folder for everything. Name them however you like, as long as the names in the spreadsheet match.

When it's ready, send the Phase 17A prompt with the folder's path.

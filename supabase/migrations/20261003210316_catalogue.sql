-- The catalogue, built for more than sofas.
--
--   product_types         sofa, armchair, footstool; later dining set, wardrobe,
--                         bed. Each type says which specification fields and
--                         filters it has, which materials it can be made in and
--                         how old-furniture removal is counted.
--   categories            a tree: Sofas > Corner Sofas, and later Dining > ...
--   ranges                a family of pieces sharing a design, with two named
--                         axes (Size x Back style; later Size x Headboard).
--   products              one row per piece, the unit a customer buys and the
--                         unit a search engine indexes. Dimensions are numbers.
--   product_variants      the photographed colourways of a piece, one SKU each.
--   material_collections  fabric collections now, wood finishes later, with an
--   materials             optional surcharge per collection.
--   offer_codes, offer_product_tiers   what the offer calculator reads.
--
-- Public pages read active rows with the publishable key; admins see and edit
-- everything through the same tables under row level security.

-- ---------------------------------------------------------------------------
-- Product types

create table public.product_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_plural text not null,
  -- [{ "key": "seats", "label": "Seats", "kind": "number", "unit": null }, ...]
  spec_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(spec_fields) = 'array'),
  -- Which filters the category pages offer for this type, e.g. ["width", "seats", "material"].
  filters jsonb not null default '[]'::jsonb check (jsonb_typeof(filters) = 'array'),
  -- Which material_collections.kind values this type can be made in.
  material_kinds text[] not null default '{}',
  -- How "take the old one away" is counted: per seat for sofas, per item for beds.
  removal_unit text not null default 'seat' check (removal_unit in ('seat', 'item', 'none')),
  google_product_category text,
  meta_product_category text,
  size_guide text,
  sort integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  parent_id uuid references public.categories (id) on delete restrict,
  description text,
  seo_title text,
  seo_description text,
  image_url text,
  sort integer not null default 99,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_not_own_parent check (parent_id is null or parent_id <> id)
);

create index categories_parent_idx on public.categories (parent_id);

-- A category may not sit under one of its own descendants.
create or replace function public.categories_prevent_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and exists (
    with recursive up as (
      select c.id, c.parent_id from public.categories c where c.id = new.parent_id
      union all
      select c.id, c.parent_id from public.categories c join up on c.id = up.parent_id
    )
    select 1 from up where up.id = new.id
  ) then
    raise exception 'CATEGORY_CYCLE: % cannot sit under its own descendant', new.slug
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger categories_prevent_cycle
  before insert or update of parent_id on public.categories
  for each row execute function public.categories_prevent_cycle();

-- ---------------------------------------------------------------------------
-- Ranges

create table public.ranges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- The name customers see.
  name text not null,
  -- The name the warehouse and OrderFlow know, when it differs (decision D4).
  trade_name text,
  axis1_name text not null default 'Size',
  axis2_name text,
  description text,
  sort integer not null default 99,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Materials library

create table public.material_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  kind text not null default 'fabric' check (kind in ('fabric', 'leather', 'wood', 'metal', 'other')),
  description text,
  supplier text,
  supplier_handle text,
  -- Added to the price of a made-to-order piece in this collection. 0 today.
  surcharge numeric(10,2) not null default 0 check (surcharge >= 0),
  sort integer not null default 99,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.material_collections (id) on delete cascade,
  code text not null,
  name text not null,
  supplier_title text,
  hex text check (hex is null or hex ~ '^#[0-9A-Fa-f]{6}$'),
  image_url text,
  sort integer not null default 99,
  is_active boolean not null default true,
  is_swatchable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_collection_code_key unique (collection_id, code)
);

create index materials_collection_sort_idx on public.materials (collection_id, sort, code);

-- ---------------------------------------------------------------------------
-- Products

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  -- The warehouse/OrderFlow name for this piece, when it differs from the title.
  trade_title text,
  product_type_id uuid not null references public.product_types (id) on delete restrict,
  range_id uuid references public.ranges (id) on delete set null,
  -- The category used for the URL and breadcrumb. Other memberships live in product_categories.
  primary_category_id uuid references public.categories (id) on delete restrict,
  -- This piece's place on the range's two axes, e.g. "3 Seater" and "High Back".
  axis1_value text,
  axis2_value text,
  base_price numeric(10,2) not null check (base_price >= 0),
  origin text not null default 'unspecified' check (origin in ('uk', 'imported', 'unspecified')),
  -- Made to order: offered in every material its product type allows.
  made_to_order boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,

  -- Dimensions in centimetres. side_a/side_b are the two arms of a corner or U.
  width_cm numeric(6,1) check (width_cm > 0),
  depth_cm numeric(6,1) check (depth_cm > 0),
  height_cm numeric(6,1) check (height_cm > 0),
  seat_height_cm numeric(6,1) check (seat_height_cm > 0),
  seat_depth_cm numeric(6,1) check (seat_depth_cm > 0),
  side_a_cm numeric(6,1) check (side_a_cm > 0),
  side_b_cm numeric(6,1) check (side_b_cm > 0),
  dimensions_note text,

  -- Typed fields per product_types.spec_fields, plus free extras.
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  description text,
  highlights text[] not null default '{}',
  seo_title text,
  seo_description text,
  gallery_images text[] not null default '{}',

  -- Maintained by the review trigger from approved reviews only.
  review_count integer not null default 0 check (review_count >= 0),
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),

  sort integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_range_axes_key
  on public.products (range_id, axis2_value, axis1_value) nulls not distinct
  where range_id is not null;
create index products_type_idx on public.products (product_type_id);
create index products_range_idx on public.products (range_id);
create index products_primary_category_idx on public.products (primary_category_id);
create index products_active_featured_idx on public.products (is_active, is_featured, sort);

create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);

create index product_categories_category_idx on public.product_categories (category_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Unchanged from the warehouse's own codes, which OrderFlow also knows.
  sku text not null unique,
  colour_name text,
  colour_hex text check (colour_hex is null or colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  material_label text,
  price_adjustment numeric(10,2) not null default 0,
  image_url text,
  sort integer not null default 99,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_variants_product_idx on public.product_variants (product_id, sort);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('studio', 'customer', 'warehouse')),
  product_id uuid references public.products (id) on delete set null,
  url text not null,
  public_id text not null,
  caption text,
  width integer,
  height integer,
  duration numeric,
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index videos_product_idx on public.videos (product_id) where is_active;

-- ---------------------------------------------------------------------------
-- Offers

-- Codes a customer can type at checkout. Validated only inside the database.
create table public.offer_codes (
  code text primary key check (code = upper(btrim(code)) and code ~ '^[A-Z0-9]{4,24}$'),
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each product's tier. The order's best tier decides the amount (shop_settings).
create table public.offer_product_tiers (
  product_id uuid primary key references public.products (id) on delete cascade,
  tier text not null check (tier in ('HIGH', 'MID', 'STANDARD', 'EXCLUDED'))
);

-- ---------------------------------------------------------------------------
-- updated_at

create trigger product_types_updated_at before update on public.product_types
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger ranges_updated_at before update on public.ranges
  for each row execute function public.set_updated_at();
create trigger material_collections_updated_at before update on public.material_collections
  for each row execute function public.set_updated_at();
create trigger materials_updated_at before update on public.materials
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger offer_codes_updated_at before update on public.offer_codes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- One SELECT policy per table (active rows for everyone, all rows for admins)
-- and separate admin write policies, so no two permissive policies overlap.

alter table public.product_types enable row level security;
alter table public.categories enable row level security;
alter table public.ranges enable row level security;
alter table public.material_collections enable row level security;
alter table public.materials enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_variants enable row level security;
alter table public.videos enable row level security;
alter table public.offer_codes enable row level security;
alter table public.offer_product_tiers enable row level security;

revoke all on table
  public.product_types, public.categories, public.ranges, public.material_collections,
  public.materials, public.products, public.product_categories, public.product_variants,
  public.videos, public.offer_codes, public.offer_product_tiers
from anon, authenticated;

grant select on table
  public.product_types, public.categories, public.ranges, public.material_collections,
  public.materials, public.products, public.product_categories, public.product_variants,
  public.videos, public.offer_product_tiers
to anon, authenticated;

grant select, insert, update, delete on table
  public.product_types, public.categories, public.ranges, public.material_collections,
  public.materials, public.products, public.product_categories, public.product_variants,
  public.videos, public.offer_codes, public.offer_product_tiers
to authenticated;

-- Reads
create policy "read product types" on public.product_types for select to anon, authenticated
  using (true);
create policy "read active categories" on public.categories for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "read active ranges" on public.ranges for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "read active material collections" on public.material_collections for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "read active materials" on public.materials for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "read active products" on public.products for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "read product categories" on public.product_categories for select to anon, authenticated
  using (true);
create policy "read active variants" on public.product_variants for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "read active videos" on public.videos for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "read offer tiers" on public.offer_product_tiers for select to anon, authenticated
  using (true);
create policy "admins read offer codes" on public.offer_codes for select to authenticated
  using ((select public.is_admin()));

-- Writes (admins only)
do $$
declare
  t text;
begin
  foreach t in array array[
    'product_types', 'categories', 'ranges', 'material_collections', 'materials',
    'products', 'product_categories', 'product_variants', 'videos', 'offer_codes',
    'offer_product_tiers'
  ] loop
    execute format(
      'create policy "admins insert %1$s" on public.%1$I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admins update %1$s" on public.%1$I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admins delete %1$s" on public.%1$I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end;
$$;

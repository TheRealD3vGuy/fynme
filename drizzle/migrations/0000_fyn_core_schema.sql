-- Find Your North: core e-commerce + CMS schema

create type public.app_role as enum ('owner','administrator','editor','store_manager','support','viewer');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Staff invitations
create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role app_role not null default 'viewer',
  invited_by uuid,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.staff_invitations to authenticated;
grant all on public.staff_invitations to service_role;
alter table public.staff_invitations enable row level security;
create policy "Staff manage invitations" on public.staff_invitations for all to authenticated
  using (public.has_role(auth.uid(),'owner') or public.has_role(auth.uid(),'administrator'))
  with check (public.has_role(auth.uid(),'owner') or public.has_role(auth.uid(),'administrator'));

-- Collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  position int not null default 0,
  is_published boolean not null default true,
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now()
);
grant select on public.collections to anon;
grant select, insert, update, delete on public.collections to authenticated;
grant all on public.collections to service_role;
alter table public.collections enable row level security;
create policy "Public read published collections" on public.collections for select to anon using (is_published);
create policy "Staff read all collections" on public.collections for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff write collections" on public.collections for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Public read categories" on public.categories for select to anon using (true);
create policy "Staff write categories" on public.categories for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_cents int not null default 0,
  compare_at_price_cents int,
  sku text,
  category_id uuid references public.categories(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_published boolean not null default true,
  is_new boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Public read published products" on public.products for select to anon using (is_published);
create policy "Staff read all products" on public.products for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff write products" on public.products for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Product variants
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  price_cents int,
  stock int not null default 0,
  options jsonb not null default '{}',
  position int not null default 0
);
grant select on public.product_variants to anon;
grant select, insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;
create policy "Public read variants of published products" on public.product_variants for select to anon
  using (exists (select 1 from public.products p where p.id = product_id and p.is_published));
create policy "Staff read all variants" on public.product_variants for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff write variants" on public.product_variants for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Product images
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  position int not null default 0
);
grant select on public.product_images to anon;
grant select, insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "Public read images of published products" on public.product_images for select to anon
  using (exists (select 1 from public.products p where p.id = product_id and p.is_published));
create policy "Staff read all images" on public.product_images for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff write images" on public.product_images for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Inventory adjustments
create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  delta int not null,
  reason text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.inventory_adjustments to authenticated;
grant all on public.inventory_adjustments to service_role;
alter table public.inventory_adjustments enable row level security;
create policy "Staff read adjustments" on public.inventory_adjustments for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff insert adjustments" on public.inventory_adjustments for insert to authenticated with check (public.is_staff(auth.uid()));

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid,
  email text not null,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','refunded','failed')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','processing','fulfilled','cancelled')),
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  tax_cents int not null default 0,
  shipping_cents int not null default 0,
  total_cents int not null default 0,
  shipping_address jsonb,
  tracking_number text,
  internal_notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Customers read own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "Staff read all orders" on public.orders for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff update orders" on public.orders for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Order items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  variant_id uuid,
  name text not null,
  variant_name text,
  quantity int not null default 1,
  unit_price_cents int not null
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Customers read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Staff read all order items" on public.order_items for select to authenticated using (public.is_staff(auth.uid()));

-- Discounts
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage','fixed','free_shipping')),
  value int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit int,
  times_used int not null default 0,
  min_order_cents int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.discounts to authenticated;
grant all on public.discounts to service_role;
alter table public.discounts enable row level security;
create policy "Staff manage discounts" on public.discounts for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Customer addresses
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal text not null,
  country text not null default 'US',
  is_default boolean not null default false
);
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant all on public.customer_addresses to service_role;
alter table public.customer_addresses enable row level security;
create policy "Users manage own addresses" on public.customer_addresses for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Contact submissions
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  category text not null default 'general',
  order_number text,
  subject text,
  message text not null,
  status text not null default 'unread' check (status in ('unread','read','resolved')),
  assigned_to uuid,
  created_at timestamptz not null default now()
);
grant insert on public.contact_submissions to anon;
grant select, insert, update on public.contact_submissions to authenticated;
grant all on public.contact_submissions to service_role;
alter table public.contact_submissions enable row level security;
create policy "Anyone can submit contact form" on public.contact_submissions for insert to anon with check (true);
create policy "Staff read submissions" on public.contact_submissions for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff update submissions" on public.contact_submissions for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Contact internal notes
create table public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.contact_submissions(id) on delete cascade,
  author_id uuid,
  note text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.contact_notes to authenticated;
grant all on public.contact_notes to service_role;
alter table public.contact_notes enable row level security;
create policy "Staff read notes" on public.contact_notes for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff add notes" on public.contact_notes for insert to authenticated with check (public.is_staff(auth.uid()));

-- Newsletter
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
grant insert on public.newsletter_subscribers to anon;
grant select, insert, update on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;
alter table public.newsletter_subscribers enable row level security;
create policy "Anyone can subscribe" on public.newsletter_subscribers for insert to anon with check (true);
create policy "Staff read subscribers" on public.newsletter_subscribers for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff update subscribers" on public.newsletter_subscribers for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Pages
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status text not null default 'published' check (status in ('draft','published')),
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now()
);
grant select on public.pages to anon;
grant select, insert, update, delete on public.pages to authenticated;
grant all on public.pages to service_role;
alter table public.pages enable row level security;
create policy "Public read published pages" on public.pages for select to anon using (status = 'published');
create policy "Staff read all pages" on public.pages for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff write pages" on public.pages for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Page sections
create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null,
  position int not null default 0,
  content jsonb not null default '{}',
  is_visible boolean not null default true
);
grant select on public.page_sections to anon;
grant select, insert, update, delete on public.page_sections to authenticated;
grant all on public.page_sections to service_role;
alter table public.page_sections enable row level security;
create policy "Public read sections of published pages" on public.page_sections for select to anon
  using (is_visible and exists (select 1 from public.pages pg where pg.id = page_id and pg.status = 'published'));
create policy "Staff read all sections" on public.page_sections for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff write sections" on public.page_sections for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Site settings (key/value: design tokens, store settings, homepage config)
create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon;
grant select, insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "Public read settings" on public.site_settings for select to anon using (true);
create policy "Staff write settings" on public.site_settings for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Navigation items
create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('header_left','header_right','footer_shop','footer_company','footer_info','social')),
  label text not null,
  href text not null,
  position int not null default 0,
  is_visible boolean not null default true
);
grant select on public.navigation_items to anon;
grant select, insert, update, delete on public.navigation_items to authenticated;
grant all on public.navigation_items to service_role;
alter table public.navigation_items enable row level security;
create policy "Public read navigation" on public.navigation_items for select to anon using (true);
create policy "Staff write navigation" on public.navigation_items for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Media assets
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  name text not null,
  alt text,
  folder text default 'general',
  file_size int,
  width int,
  height int,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.media_assets to anon;
grant select, insert, update, delete on public.media_assets to authenticated;
grant all on public.media_assets to service_role;
alter table public.media_assets enable row level security;
create policy "Public read media" on public.media_assets for select to anon using (true);
create policy "Staff write media" on public.media_assets for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Activity log (append-only)
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text,
  entity_id text,
  summary text,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "Staff read activity" on public.activity_log for select to authenticated using (public.is_staff(auth.uid()));
create policy "Staff append activity" on public.activity_log for insert to authenticated with check (public.is_staff(auth.uid()));

-- Indexes
create index products_collection_idx on public.products(collection_id);
create index products_published_idx on public.products(is_published);
create index product_variants_product_idx on public.product_variants(product_id);
create index product_images_product_idx on public.product_images(product_id);
create index orders_user_idx on public.orders(user_id);
create index order_items_order_idx on public.order_items(order_id);
create index page_sections_page_idx on public.page_sections(page_id);
create index navigation_location_idx on public.navigation_items(location);

-- ============ SEED DATA ============

insert into public.categories (name, slug) values
  ('Apparel','apparel'), ('Stickers','stickers'), ('Accessories','accessories');

insert into public.collections (name, slug, description, position, is_featured) values
  ('Good Day','good-day','Uplifting designs for everyday adventures.',1,true),
  ('Faith','faith','Designs rooted in faith and purpose.',2,true),
  ('Street Culture','street-culture','Streetwear inspired by the culture.',3,true),
  ('Forever','forever','Timeless pieces that never fade.',4,true),
  ('Roots','roots','Grounded in North Idaho heritage.',5,true),
  ('Nostalgia','nostalgia','Throwback designs with a modern edge.',6,true),
  ('Local Love','local-love','Celebrating the Pacific Northwest.',7,true),
  ('Mind & Grind','mind-grind','For the hustlers and the dreamers.',8,true);

insert into public.site_settings (key, value) values
  ('store', '{"name":"Find Your North","tagline":"Apparel & stickers for those who find their path in the wild. Based in Idaho.","contact_email":"hello@findyournorth.co","currency":"USD"}'),
  ('hero', '{"heading":"FIND YOUR NORTH","subtitle":"Apparel and stickers for those who find their path in the wild.","cta_text":"DISCOVER THE COLLECTION","cta_href":"/discover","overlay":0.45,"image_url":""}'),
  ('homepage', '{"featured_enabled":true,"featured_heading":"FEATURED","wholesale_enabled":true,"series_enabled":true,"stickers_enabled":true,"newsletter_enabled":true}'),
  ('design', '{"preset":"northwest-minimal"}');

insert into public.navigation_items (location, label, href, position) values
  ('header_left','About','/about',1),
  ('header_left','Discover','/discover',2),
  ('header_right','Contact','/contact',1),
  ('header_right','Account','/account',2),
  ('footer_shop','Featured','/discover?filter=featured',1),
  ('footer_shop','All Series','/discover',2),
  ('footer_shop','Stickers','/collections/stickers',3),
  ('footer_shop','Sale','/discover?filter=sale',4),
  ('footer_company','About','/about',1),
  ('footer_company','Partnership','/contact?category=wholesale',2),
  ('footer_company','Contact','/contact',3),
  ('footer_info','Shipping','/pages/shipping',1),
  ('footer_info','Returns','/pages/returns',2),
  ('footer_info','Size Guide','/pages/size-guide',3),
  ('footer_info','Privacy','/pages/privacy',4),
  ('footer_info','Terms','/pages/terms',5);

insert into public.pages (title, slug, status) values
  ('Home','home','published'),
  ('About','about','published'),
  ('Shipping','shipping','published'),
  ('Returns','returns','published'),
  ('Size Guide','size-guide','published'),
  ('Privacy','privacy','published'),
  ('Terms','terms','published');

insert into public.page_sections (page_id, type, position, content)
select p.id, 'rich_text', 1, '{"heading":"Finding your north isn''t about having everything figured out.","body":"It''s about discovering what matters to you, finding your direction, and creating something that represents who you are.\n\nFind Your North brings together apparel, stickers, and designs inspired by the outdoors, personal expression, faith, and life in the Pacific Northwest."}'
from public.pages p where p.slug = 'about';
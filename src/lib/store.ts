import { supabase } from "@/integrations/supabase/client";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  is_new: boolean;
  is_featured: boolean;
  tags: string[];
  collection_name: string | null;
  collection_slug: string | null;
  image_url: string | null;
  total_stock: number;
}

export interface CollectionData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  position: number;
  product_count: number;
}

const PRODUCT_SELECT =
  "id, name, slug, price_cents, compare_at_price_cents, is_new, is_featured, tags, collections(name, slug), product_images(url, position), product_variants(stock)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProduct(row: any): ProductCardData {
  const images = [...(row.product_images ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const stock = (row.product_variants ?? []).reduce(
    (s: number, v: { stock: number }) => s + v.stock,
    0,
  );
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price_cents: row.price_cents,
    compare_at_price_cents: row.compare_at_price_cents,
    is_new: row.is_new,
    is_featured: row.is_featured,
    tags: row.tags ?? [],
    collection_name: row.collections?.name ?? null,
    collection_slug: row.collections?.slug ?? null,
    image_url: images[0]?.url ?? null,
    total_stock: stock,
  };
}

export async function fetchProducts(options?: {
  collectionSlug?: string;
  featuredOnly?: boolean;
  stickersOnly?: boolean;
  search?: string;
  saleOnly?: boolean;
}): Promise<ProductCardData[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_published", true);

  if (options?.featuredOnly) query = query.eq("is_featured", true);
  if (options?.saleOnly) query = query.not("compare_at_price_cents", "is", null);
  if (options?.stickersOnly) query = query.contains("tags", ["sticker"]);
  if (options?.search) {
    const term = `%${options.search.replace(/[%_]/g, "")}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }
  if (options?.collectionSlug) {
    const { data: col } = await supabase
      .from("collections")
      .select("id")
      .eq("slug", options.collectionSlug)
      .maybeSingle();
    if (!col) return [];
    query = query.eq("collection_id", col.id);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function fetchCollections(): Promise<CollectionData[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, description, cover_image_url, position, products(id)")
    .eq("is_published", true)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    cover_image_url: c.cover_image_url,
    position: c.position,
    product_count: (c.products ?? []).length,
  }));
}

export async function fetchSetting<T>(key: string): Promise<T | null> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T) ?? null;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  position: number;
}

export async function fetchNav(location: string): Promise<NavItem[]> {
  const { data } = await supabase
    .from("navigation_items")
    .select("id, label, href, position")
    .eq("location", location)
    .eq("is_visible", true)
    .order("position");
  return data ?? [];
}

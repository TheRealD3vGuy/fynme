import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts } from "@/lib/store";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { readRecent, recordRecent, type RecentItem } from "@/lib/recent";
import { ProductCard } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SIZE_GUIDE_ROWS: Array<[string, string, string]> = [
  ["S", '36–38"', '27"'],
  ["M", '39–41"', '28"'],
  ["L", '42–44"', '29"'],
  ["XL", '45–47"', '30"'],
  ["XXL", '48–50"', '31"'],
];

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("products")
      .select(
        "id, name, slug, description, price_cents, compare_at_price_cents, sku, is_new, tags, collections(name, slug), categories(name, slug), product_images(id, url, alt, position), product_variants(id, name, sku, stock, price_cents, options, position)",
      )
      .eq("slug", params.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Product"} — Find Your North` },
      {
        name: "description",
        content: loaderData?.description ?? "Find Your North product.",
      },
      { property: "og:title", content: loaderData?.name ?? "Product" },
      {
        property: "og:description",
        content: loaderData?.description ?? "",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-7xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl uppercase">Product not found</h1>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/discover">Back to Discover</Link>
      </Button>
    </div>
  ),
});

function ProductPage() {
  const product = Route.useLoaderData();
  const { addItem } = useCart();
  const images = [...product.product_images].sort(
    (a, b) => a.position - b.position,
  );
  const variants = [...product.product_variants].sort(
    (a, b) => a.position - b.position,
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const priceCents = variant?.price_cents ?? product.price_cents;
  const onSale =
    product.compare_at_price_cents != null &&
    product.compare_at_price_cents > priceCents;
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);
  const soldOut = totalStock <= 0;
  const variantOutOfStock = variant != null && variant.stock <= 0;

  const { data: related } = useQuery({
    queryKey: ["related", product.slug],
    queryFn: async () => {
      const list = await fetchProducts({
        collectionSlug: product.collections?.slug ?? undefined,
      });
      return list.filter((p) => p.slug !== product.slug).slice(0, 4);
    },
  });

  function handleAdd() {
    if (!variant) {
      toast.error("Please select an option first.");
      return;
    }
    if (variant.stock <= 0) {
      toast.error("That option is sold out.");
      return;
    }
    addItem({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      variantName: variant.name,
      priceCents,
      imageUrl: images[0]?.url ?? null,
    });
    toast.success(`${product.name} added to cart.`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden bg-card">
            {images[selectedImage] ? (
              <img
                src={images[selectedImage].url}
                alt={images[selectedImage].alt ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 overflow-hidden border ${
                    i === selectedImage ? "border-accent" : "border-border"
                  }`}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.collections && (
            <Link
              to="/collections/$slug"
              params={{ slug: product.collections.slug }}
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent"
            >
              {product.collections.name} Series
            </Link>
          )}
          <h1 className="mt-1 font-display text-4xl font-bold uppercase tracking-wide">
            {product.name}
          </h1>
          <p className="mt-3 text-xl">
            {onSale && (
              <span className="mr-3 text-muted-foreground line-through">
                {formatPrice(product.compare_at_price_cents!)}
              </span>
            )}
            <span className={onSale ? "text-accent" : ""}>
              {formatPrice(priceCents)}
            </span>
          </p>

          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {variants.length > 1 && (
            <div className="mt-6">
              <p className="section-label text-sm text-muted-foreground">
                Size
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    disabled={v.stock <= 0}
                    className={`border px-4 py-2 text-sm font-semibold ${
                      v.id === variantId
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border hover:border-foreground"
                    } ${v.stock <= 0 ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border border-border">
              <button
                className="px-3 py-2 hover:bg-secondary"
                aria-label="Decrease quantity"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center">{quantity}</span>
              <button
                className="px-3 py-2 hover:bg-secondary"
                aria-label="Increase quantity"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={soldOut || variantOutOfStock}
              onClick={handleAdd}
            >
              {soldOut ? "Sold Out" : variantOutOfStock ? "Size Sold Out" : "Add to Cart"}
            </Button>
          </div>

          <div className="mt-8 space-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
            {product.sku && <p>SKU: {variant?.sku ?? product.sku}</p>}
            <p>
              Shipping: calculated at checkout. Orders ship from North Idaho.
            </p>
            <p>
              Returns: 30-day returns on unworn items. See{" "}
              <Link to="/pages/$slug" params={{ slug: "returns" }} className="underline">
                Returns
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {related && related.length > 0 && (
        <section className="mt-16">
          <h2 className="section-label mb-6 border-b border-border pb-3 text-2xl">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

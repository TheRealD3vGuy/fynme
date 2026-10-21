import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { ProductCardData } from "@/lib/store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuickVariant {
  id: string;
  name: string;
  price_cents: number | null;
  stock: number;
}

const LOW_STOCK_AT = 5;

export function ProductCard({ product }: { product: ProductCardData }) {
  const { addItem } = useCart();
  const [variants, setVariants] = useState<QuickVariant[] | null>(null);
  const [open, setOpen] = useState(false);

  const onSale =
    product.compare_at_price_cents != null &&
    product.compare_at_price_cents > product.price_cents;
  const soldOut = product.total_stock <= 0;
  const lowStock = !soldOut && product.total_stock <= LOW_STOCK_AT;

  async function loadVariants(): Promise<QuickVariant[]> {
    if (variants) return variants;
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, name, price_cents, stock")
      .eq("product_id", product.id)
      .order("position");
    if (error) {
      toast.error("Couldn't load options. Try again.");
      return [];
    }
    setVariants(data ?? []);
    return data ?? [];
  }

  function addVariant(v: QuickVariant) {
    addItem({
      productId: product.id,
      variantId: v.id,
      slug: product.slug,
      name: product.name,
      variantName: v.name,
      priceCents: v.price_cents ?? product.price_cents,
      imageUrl: product.image_url,
    });
    setOpen(false);
    toast.success(`${product.name} added to cart.`);
  }

  async function handleQuickAdd() {
    const list = await loadVariants();
    const available = list.filter((v) => v.stock > 0);
    if (available.length === 1) {
      addVariant(available[0]);
      return;
    }
    if (available.length === 0) {
      toast.error("Sold out.");
      return;
    }
    setOpen(true);
  }

  return (
    <div className="group block">
      <div className="relative aspect-square overflow-hidden bg-card">
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          aria-label={product.name}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </Link>
        <div className="absolute left-2 top-2 flex gap-1">
          {onSale && !soldOut && (
            <span className="bg-accent px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
              Sale
            </span>
          )}
          {soldOut && (
            <span className="bg-primary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
              Sold Out
            </span>
          )}
          {lowStock && (
            <span className="bg-secondary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
              Only {product.total_stock} left
            </span>
          )}
          {product.is_new && !soldOut && !onSale && !lowStock && (
            <span className="bg-primary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
              New
            </span>
          )}
        </div>
        {!soldOut && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={handleQuickAdd}
                aria-label={`Quick add ${product.name} to cart`}
                className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus:opacity-100 group-hover:opacity-100"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Quick Add
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2" align="end">
              <p className="section-label mb-2 text-xs text-muted-foreground">
                Select size
              </p>
              <div className="flex flex-col gap-1">
                {(variants ?? []).map((v) => (
                  <button
                    key={v.id}
                    disabled={v.stock <= 0}
                    onClick={() => addVariant(v)}
                    className="border border-border px-2 py-1 text-left text-sm hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="mt-3 block"
      >
        {product.collection_name && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {product.collection_name} Series
          </p>
        )}
        <h3 className="font-display text-xl font-semibold uppercase tracking-wide">
          {product.name}
        </h3>
        <p className="mt-0.5 text-sm">
          {onSale && (
            <span className="mr-2 text-muted-foreground line-through">
              {formatPrice(product.compare_at_price_cents!)}
            </span>
          )}
          <span className={onSale ? "text-accent" : ""}>
            {formatPrice(product.price_cents)}
          </span>
        </p>
      </Link>
    </div>
  );
}

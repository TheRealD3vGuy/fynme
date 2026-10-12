import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/format";
import type { ProductCardData } from "@/lib/store";

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale =
    product.compare_at_price_cents != null &&
    product.compare_at_price_cents > product.price_cents;
  const soldOut = product.total_stock <= 0;

  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden bg-card">
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
          {product.is_new && !soldOut && !onSale && (
            <span className="bg-primary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
              New
            </span>
          )}
        </div>
      </div>
      <div className="mt-3">
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
      </div>
    </Link>
  );
}

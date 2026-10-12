import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Find Your North" },
      { name: "description", content: "Review your Find Your North order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotalCents } = useCart();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        Checkout
      </h1>

      {items.length === 0 ? (
        <div className="mt-10 border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/discover">Continue Shopping</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-8 divide-y divide-border border border-border bg-card">
            {items.map((item) => (
              <div key={item.variantId} className="flex items-center gap-4 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden bg-secondary">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg font-semibold uppercase leading-tight">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.variantName} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {formatPrice(item.priceCents * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border border-border bg-secondary p-4">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-display text-xl font-semibold">
              {formatPrice(subtotalCents)}
            </span>
          </div>
          <div className="mt-8 border border-border bg-card p-6 text-center">
            <p className="font-display text-xl font-semibold uppercase">
              Online payments coming soon
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              We're finishing our secure checkout. In the meantime, reach out
              through our contact page and we'll sort your order out directly.
            </p>
            <Button asChild className="mt-6">
              <Link to="/contact" search={{ category: "order" }}>
                Contact Us to Order
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

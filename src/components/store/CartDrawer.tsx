import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export function CartDrawer() {
  const { items, isOpen, setOpen, updateQuantity, removeItem, subtotalCents } =
    useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col bg-background sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl uppercase tracking-wide">
            Your Cart
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="outline" onClick={() => setOpen(false)}>
              <Link to="/discover">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto py-4">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden bg-card">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-semibold uppercase leading-tight">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.variantName}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        aria-label={`Remove ${item.name}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center border border-border">
                        <button
                          className="px-2 py-1 hover:bg-secondary"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          className="px-2 py-1 hover:bg-secondary"
                          aria-label="Increase quantity"
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(item.priceCents * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="mb-4 flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-xl font-semibold">
                  {formatPrice(subtotalCents)}
                </span>
              </div>
              <Button className="w-full" size="lg" asChild>
                <Link to="/checkout" onClick={() => setOpen(false)}>
                  Proceed to Checkout
                </Link>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

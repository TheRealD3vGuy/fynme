import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { fetchProducts, type ProductCardData } from "@/lib/store";
import { formatPrice } from "@/lib/format";

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductCardData[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults(await fetchProducts({ search: query.trim() }));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl px-4 pt-24">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                onClose();
                navigate({
                  to: "/discover",
                  search: { q: query.trim() },
                });
              }
            }}
            placeholder="Search products, collections..."
            className="flex-1 bg-transparent font-display text-2xl uppercase tracking-wide outline-none placeholder:text-muted-foreground"
          />
          <button onClick={onClose} aria-label="Close search">
            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        <div className="mt-6 max-h-[60vh] overflow-y-auto">
          {searching && (
            <p className="text-sm text-muted-foreground">Searching...</p>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;. Try a different search.
            </p>
          )}
          <div className="divide-y divide-border">
            {results.map((p) => (
              <Link
                key={p.id}
                to="/products/$slug"
                params={{ slug: p.slug }}
                onClick={onClose}
                className="flex items-center gap-4 py-3 hover:bg-secondary/50"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden bg-card">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg font-semibold uppercase">
                    {p.name}
                  </p>
                  {p.collection_name && (
                    <p className="text-xs uppercase text-muted-foreground">
                      {p.collection_name}
                    </p>
                  )}
                </div>
                <span className="text-sm">{formatPrice(p.price_cents)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

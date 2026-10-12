import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  fetchCollections,
  fetchProducts,
  type ProductCardData,
} from "@/lib/store";
import { ProductCard } from "@/components/store/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortKey = "newest" | "price_asc" | "price_desc" | "alpha" | "featured";

export const Route = createFileRoute("/discover")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    q?: string | undefined;
    collection?: string | undefined;
    filter?: string | undefined;
  } => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    collection:
      typeof search["collection"] === "string"
        ? search["collection"]
        : undefined,
    filter: typeof search["filter"] === "string" ? search["filter"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Discover — Find Your North" },
      {
        name: "description",
        content:
          "Shop all Find Your North apparel and stickers. Search by product, series, or tag.",
      },
      { property: "og:title", content: "Discover — Find Your North" },
      {
        property: "og:description",
        content: "Shop all Find Your North apparel and stickers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const search = Route.useSearch();
  const q = search.q ?? "";
  const collection = search.collection ?? "";
  const filter = search.filter ?? "";
  const navigate = useNavigate({ from: "/discover" });
  const [searchInput, setSearchInput] = useState(q);
  const [sort, setSort] = useState<SortKey>("newest");
  const [saleOnly, setSaleOnly] = useState(filter === "sale");
  const [inStockOnly, setInStockOnly] = useState(false);

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "discover", q, collection, saleOnly],
    queryFn: () =>
      fetchProducts({
        search: q || undefined,
        collectionSlug: collection || undefined,
        saleOnly: saleOnly || undefined,
      }),
  });

  const sorted = useMemo(() => {
    let list: ProductCardData[] = [...(products ?? [])];
    if (filter === "featured") list = list.filter((p) => p.is_featured);
    if (inStockOnly) list = list.filter((p) => p.total_stock > 0);
    switch (sort) {
      case "price_asc":
        list.sort((a, b) => a.price_cents - b.price_cents);
        break;
      case "price_desc":
        list.sort((a, b) => b.price_cents - a.price_cents);
        break;
      case "alpha":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "featured":
        list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
        break;
    }
    return list;
  }, [products, sort, inStockOnly, filter]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = searchInput.trim();
    // admin4287 is only a navigation shortcut to the staff sign-in — never a credential.
    if (term === "admin4287") {
      navigate({ to: "/admin" });
      return;
    }
    navigate({ search: (prev) => ({ ...prev, q: term }) });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        Discover
      </h1>

      <form onSubmit={submitSearch} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products, series, tags..."
            className="bg-secondary pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
        {q && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchInput("");
              navigate({ search: (prev) => ({ ...prev, q: "" }) });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select
          value={collection || "all"}
          onValueChange={(v) =>
            navigate({
              search: (prev) => ({
                ...prev,
                collection: v === "all" ? "" : v,
              }),
            })
          }
        >
          <SelectTrigger className="w-44 bg-secondary">
            <SelectValue placeholder="All series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All series</SelectItem>
            {(collections ?? []).map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44 bg-secondary">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="alpha">A to Z</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={saleOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setSaleOnly(!saleOnly)}
        >
          On Sale
        </Button>
        <Button
          variant={inStockOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setInStockOnly(!inStockOnly)}
        >
          In Stock
        </Button>

        <span className="ml-auto text-sm text-muted-foreground">
          {sorted.length} products
        </span>
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Loading...</p>
      ) : sorted.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-2xl uppercase text-muted-foreground">
            Nothing found
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different search or browse all series.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

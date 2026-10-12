import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts } from "@/lib/store";
import { ProductCard } from "@/components/store/ProductCard";

export const Route = createFileRoute("/collections/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("collections")
      .select("id, name, slug, description, cover_image_url, seo_title, seo_description")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.seo_title ?? loaderData?.name ?? "Collection"} — Find Your North`,
      },
      {
        name: "description",
        content:
          loaderData?.seo_description ??
          loaderData?.description ??
          "Find Your North collection.",
      },
      { property: "og:title", content: loaderData?.name ?? "Collection" },
      {
        property: "og:description",
        content: loaderData?.description ?? "",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectionPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-7xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl uppercase">Collection not found</h1>
    </div>
  ),
});

function CollectionPage() {
  const collection = Route.useLoaderData();
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "collection", collection.slug],
    queryFn: () => fetchProducts({ collectionSlug: collection.slug }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {collection.cover_image_url && (
        <div className="mb-8 h-48 overflow-hidden md:h-64">
          <img
            src={collection.cover_image_url}
            alt={collection.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <p className="section-label text-sm text-muted-foreground">Series</p>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        {collection.name}
      </h1>
      {collection.description && (
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {collection.description}
        </p>
      )}

      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Loading...</p>
      ) : !products || products.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">
          No products in this series yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

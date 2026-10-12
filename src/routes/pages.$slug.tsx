import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pages/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Find Your North` },
      { name: "description", content: "Find Your North store information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CmsPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-bold uppercase">Not Found</h1>
      <p className="mt-3 text-muted-foreground">
        This page doesn't exist or isn't published yet.
      </p>
    </div>
  ),
});

function CmsPage() {
  const { slug } = Route.useParams();
  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("pages")
        .select("title, page_sections(heading, body, position)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!page) throw notFound();

  const sections = [...(page.page_sections ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl font-bold uppercase tracking-wide">
        {page.title}
      </h1>
      {sections.map((s, i) => (
        <div key={i} className="mt-8">
          {s.heading && (
            <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
              {s.heading}
            </h2>
          )}
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
            {s.body}
          </p>
        </div>
      ))}
    </div>
  );
}

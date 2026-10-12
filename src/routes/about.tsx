import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Find Your North" },
      {
        name: "description",
        content:
          "Find Your North is an independent clothing and sticker brand from North Idaho, inspired by the Pacific Northwest.",
      },
      { property: "og:title", content: "About — Find Your North" },
      {
        property: "og:description",
        content:
          "An independent clothing and sticker brand from North Idaho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: page } = useQuery({
    queryKey: ["page", "about"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pages")
        .select("title, page_sections(type, content, position, is_visible)")
        .eq("slug", "about")
        .eq("status", "published")
        .maybeSingle();
      return data;
    },
  });

  const sections = [...(page?.page_sections ?? [])]
    .filter((s) => s.is_visible)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="section-label text-sm text-muted-foreground">Our Story</p>
      <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide">
        {page?.title ?? "About Find Your North"}
      </h1>
      {sections.length > 0 ? (
        sections.map((s, i) => {
          const content = s.content as { heading?: string; body?: string };
          return (
            <div key={i} className="mt-8">
              {content.heading && (
                <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
                  {content.heading}
                </h2>
              )}
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                {content.body}
              </p>
            </div>
          );
        })
      ) : (
        <p className="mt-8 leading-relaxed text-muted-foreground">
          Find Your North is an independent clothing and sticker brand born in
          North Idaho. We make gear for people who find their path in the wild
          — in the forests, on the trails, and under big Pacific Northwest
          skies.
        </p>
      )}
      <Button asChild className="mt-10" size="lg">
        <Link to="/discover">Shop the Collection</Link>
      </Button>
    </div>
  );
}

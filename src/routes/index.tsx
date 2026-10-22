import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCollections,
  fetchProducts,
  fetchSetting,
} from "@/lib/store";
import { ProductCard } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/lib/reveal";

interface HeroSettings {
  heading: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  overlay: number;
  image_url: string;
}

interface HomepageSettings {
  featured_enabled: boolean;
  featured_heading: string;
  wholesale_enabled: boolean;
  series_enabled: boolean;
  stickers_enabled: boolean;
  newsletter_enabled: boolean;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Find Your North — Apparel & Stickers from North Idaho" },
      {
        name: "description",
        content:
          "Independent clothing and sticker brand from North Idaho. Shop hoodies, tees, and die-cut stickers inspired by the Pacific Northwest.",
      },
      { property: "og:title", content: "Find Your North" },
      {
        property: "og:description",
        content:
          "Apparel & stickers for those who find their path in the wild. Based in Idaho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: hero } = useQuery({
    queryKey: ["setting", "hero"],
    queryFn: () => fetchSetting<HeroSettings>("hero"),
  });
  const { data: homepage } = useQuery({
    queryKey: ["setting", "homepage"],
    queryFn: () => fetchSetting<HomepageSettings>("homepage"),
  });
  const { data: featured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featuredOnly: true }),
  });
  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });
  const { data: stickers } = useQuery({
    queryKey: ["products", "stickers"],
    queryFn: () => fetchProducts({ stickersOnly: true }),
  });

  const settings: HomepageSettings = homepage ?? {
    featured_enabled: true,
    featured_heading: "FEATURED",
    wholesale_enabled: true,
    series_enabled: true,
    stickers_enabled: true,
    newsletter_enabled: true,
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative h-[60vh] min-h-[400px] w-full md:h-[75vh]">
          {hero?.image_url && (
            <img
              src={hero.image_url}
              alt="Foggy Pacific Northwest forest"
              className="animate-hero-image absolute inset-0 h-full w-full object-cover"
              width={1920}
              height={1088}
            />
          )}
          <div
            className="absolute inset-0 bg-background"
            style={{ opacity: hero?.overlay ?? 0.45 }}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-10 text-right">
            <h1 className="animate-hero-rise text-outline font-display text-6xl font-bold uppercase leading-none tracking-tight md:text-8xl lg:text-9xl">
              {hero?.heading ?? "FIND YOUR NORTH"}
            </h1>
            {hero?.subtitle && (
              <p className="animate-hero-rise mt-3 text-sm text-foreground/90 md:text-base" style={{ animationDelay: "200ms" }}>
                {hero.subtitle}
              </p>
            )}
            {hero?.cta_text && (
              <Button asChild size="lg" className="animate-hero-rise mt-5" style={{ animationDelay: "350ms" }}>
                <Link to={hero.cta_href ?? "/discover"}>{hero.cta_text}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      {settings.featured_enabled && featured && featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-6 flex items-baseline gap-3 border-b border-border pb-3">
            <h2 className="section-label text-2xl">
              {settings.featured_heading}
            </h2>
            <span className="text-sm text-muted-foreground">
              {featured.length} products
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6">
            {featured.slice(0, 6).map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 90}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Wholesale banner */}
      {settings.wholesale_enabled && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <Reveal><div className="flex flex-col items-start justify-between gap-6 border border-border bg-secondary p-8 md:flex-row md:items-center md:p-12">
            <div>
              <p className="section-label text-sm text-muted-foreground">
                Business Partnership
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-wide md:text-4xl">
                Wholesale &amp; Bulk Pricing
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Partner with Find Your North for exclusive wholesale rates,
                early access to new releases, and co-branded opportunities for
                your shop.
              </p>
            </div>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact" search={{ category: "wholesale" }}>
                Get in Touch
              </Link>
            </Button>
          </div></Reveal>
        </section>
      )}

      {/* Shop by series */}
      {settings.series_enabled && collections && collections.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-6 flex items-baseline gap-3 border-b border-border pb-3">
            <h2 className="section-label text-2xl">Shop by Series</h2>
            <span className="text-sm text-muted-foreground">
              {collections.length} collections
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {collections.map((c, i) => (
              <Reveal key={c.id} delay={(i % 4) * 80}>
              <Link
                to="/collections/$slug"
                params={{ slug: c.slug }}
                className="ease-brand group block h-full border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Series #{i + 1}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold uppercase tracking-wide group-hover:text-accent">
                  {c.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.product_count} products
                </p>
              </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Stickers */}
      {settings.stickers_enabled && stickers && stickers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-6 flex items-baseline justify-between border-b border-border pb-3">
            <div className="flex items-baseline gap-3">
              <h2 className="section-label text-2xl">Stickers</h2>
              <span className="text-sm text-muted-foreground">
                {stickers.length} designs
              </span>
            </div>
            <Link
              to="/discover"
              search={{ q: "sticker" }}
              className="text-sm font-semibold uppercase tracking-wider text-accent hover:underline"
            >
              Shop All Stickers
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
            {stickers.slice(0, 5).map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      {settings.newsletter_enabled && <NewsletterSection />}
    </div>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("You're already subscribed.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }
    setDone(true);
  }

  return (
    <section className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-14 text-center">
        <h2 className="font-display text-3xl font-bold uppercase tracking-wide">
          Join the Journey
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          New releases, series drops, and stories from North Idaho. No spam —
          unsubscribe anytime.
        </p>
        {done ? (
          <p className="mt-6 text-accent">
            Thanks for subscribing. Welcome aboard.
          </p>
        ) : (
          <form
            onSubmit={subscribe}
            className="mx-auto mt-6 flex max-w-md gap-2"
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-background"
            />
            <Button type="submit" disabled={loading}>
              {loading ? "..." : "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

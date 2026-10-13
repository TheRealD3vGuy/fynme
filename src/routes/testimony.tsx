import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/testimony")({
  head: () => ({
    meta: [
      { title: "My Testimony — Find Your North" },
      {
        name: "description",
        content:
          "How I came to Christ, got baptized, and why every Find Your North shirt starts with faith.",
      },
      { property: "og:title", content: "My Testimony — Find Your North" },
      {
        property: "og:description",
        content:
          "How I came to Christ, got baptized, and why every Find Your North shirt starts with faith.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestimonyPage,
});

const SECTIONS: { label: string; heading: string; body: string }[] = [
  {
    label: "Where It Started",
    heading: "Coming to Christ",
    body: `I didn't come to Christ because my life was put together. I came to Him because I finally admitted it wasn't. Somewhere in the middle of everything I was chasing, I heard the truth that changed everything: God loved me before I ever loved Him — so much that He sent His Son to die for me while I was still a sinner (Romans 5:8).\n\nGrace isn't something you earn. It's something you receive. When I understood that Jesus took my place — my sin, my shame, my record — and gave me His righteousness instead, I stopped running. I gave my life to Christ, not because I got my act together, but because He never let go of me first.`,
  },
  {
    label: "Going Public",
    heading: "My Baptism",
    body: `Getting baptized was me saying it out loud: the old me is buried, and a new me walked out of that water. When you're baptized, you're publicly declaring what Jesus did for you — united with Him in His death and raised to walk in newness of life (Romans 6:4).\n\nIt wasn't a ritual or a formality. It was a line in the sand. I belong to Christ now. My identity, my direction, and my purpose all changed that day — and I wanted everyone around me to know it.`,
  },
  {
    label: "The Why Behind FYN",
    heading: "Why I Make Shirts",
    body: `Find Your North was born out of that new life. "North" isn't just a direction on a map or a nod to the Pacific Northwest — it's a picture of the One we're navigating toward. When you find your true North, everything else falls into place.\n\nI make shirts because I wanted my faith to leave the church walls and walk into everyday life — onto trails, into coffee shops, into every place people actually are. A shirt can't save anyone, but it can start a conversation, plant a seed, and remind the person wearing it who they belong to.\n\nEvery design we print carries that hope: truth worn on the outside, carried on the inside.`,
  },
];

function TestimonyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="section-label text-sm text-muted-foreground">My Story</p>
      <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide">
        My Testimony
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Find Your North was never just a clothing brand. It started with the
        most important change in my life — here's the story behind it.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="mt-14">
          <p className="section-label text-sm text-muted-foreground">
            {section.label}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold uppercase tracking-wide">
            {section.heading}
          </h2>
          {section.body.split("\n\n").map((paragraph, i) => (
            <p
              key={i}
              className="mt-4 leading-relaxed text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <blockquote className="mt-14 border-l-2 border-accent pl-6">
        <p className="font-display text-2xl font-semibold uppercase tracking-wide text-foreground">
          "Trust in the Lord with all your heart, and do not lean on your own
          understanding."
        </p>
        <cite className="mt-2 block text-sm not-italic text-muted-foreground">
          Proverbs 3:5
        </cite>
      </blockquote>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/discover">Shop the Collection</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/about">About Find Your North</Link>
        </Button>
      </div>
    </div>
  );
}

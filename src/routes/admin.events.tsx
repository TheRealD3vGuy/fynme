import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/events")({
  head: () => ({
    meta: [
      { title: "Private Events Staff — Find Your North" },
      { name: "description", content: "Staff management of invitation-only Find Your North events." },
      { property: "og:title", content: "Private Events Staff — Find Your North" },
      { property: "og:description", content: "Staff management of invitation-only Find Your North events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EventsAdmin,
});

function EventsAdmin() {
  return (
    <div>
      <h1 className="font-display text-4xl font-bold uppercase">Private Events</h1>
      <p className="mt-4 text-muted-foreground">Event management is not available yet.</p>
    </div>
  );
}
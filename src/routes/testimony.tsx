import { createFileRoute, redirect } from "@tanstack/react-router";

// Testimony now lives on the About page; keep old links working.
export const Route = createFileRoute("/testimony")({
  beforeLoad: () => {
    throw redirect({ to: "/about", hash: "testimony", statusCode: 301 });
  },
});

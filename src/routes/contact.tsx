import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/contact")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { category?: string } => ({
    category:
      typeof search["category"] === "string" ? search["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contact — Find Your North" },
      {
        name: "description",
        content:
          "Get in touch with Find Your North — questions, wholesale inquiries, or just to say hi.",
      },
      { property: "og:title", content: "Contact — Find Your North" },
      {
        property: "og:description",
        content: "Questions, wholesale inquiries, or just to say hi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { category } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(category ?? "general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.includes("@") || !message.trim()) {
      toast.error("Please fill in every field with a valid email.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      category: topic,
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="section-label text-sm text-muted-foreground">Say Hello</p>
      <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide">
        Contact Us
      </h1>
      <p className="mt-3 text-muted-foreground">
        Questions about an order, wholesale pricing, or a sticker idea? We read
        every message.
      </p>

      {sent ? (
        <div className="mt-10 border border-border bg-secondary p-8 text-center">
          <h2 className="font-display text-2xl font-semibold uppercase">
            Message Sent
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks for reaching out — we usually reply within a couple of days.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-10 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary"
              required
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-secondary"
              required
            />
          </div>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General question</SelectItem>
              <SelectItem value="order">Order support</SelectItem>
              <SelectItem value="wholesale">Wholesale / bulk pricing</SelectItem>
              <SelectItem value="press">Press / collabs</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your message..."
            rows={6}
            className="bg-secondary"
            required
          />
          <Button type="submit" size="lg" disabled={sending}>
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      )}
    </div>
  );
}

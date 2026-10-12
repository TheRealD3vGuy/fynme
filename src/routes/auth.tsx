import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Find Your North" },
      {
        name: "description",
        content: "Sign in or create your Find Your North account.",
      },
      { property: "og:title", content: "Sign In — Find Your North" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/account" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      navigate({ to: "/account" });
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Account created! Check your email to confirm, then sign in.");
      setMode("signin");
    }
  }

  async function signInWithGoogle() {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Google sign-in failed. Please try again.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        {mode === "signin" ? "Sign In" : "Create Account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Welcome back. Sign in to view your orders."
          : "Join Find Your North to track orders and check out faster."}
      </p>

      <Button
        variant="outline"
        className="mt-8 w-full"
        onClick={signInWithGoogle}
      >
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="bg-secondary"
            required
          />
        )}
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="bg-secondary"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="bg-secondary"
          minLength={6}
          required
        />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading
            ? "..."
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}
        </Button>
      </form>

      <button
        className="mt-6 text-sm text-accent hover:underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

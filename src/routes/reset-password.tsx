import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Find Your North" },
      {
        name: "description",
        content: "Choose a new password for your Find Your North account.",
      },
      { property: "og:title", content: "Reset Password — Find Your North" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      // If the user already holds a session (e.g. refreshed the page after
      // the recovery event), allow the form as well.
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/account" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        Reset Password
      </h1>
      {!ready ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Open the reset link from your email to choose a new password. If you
          already did, this page is checking your link — give it a moment.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a new password for your account.
          </p>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="bg-secondary"
            minLength={6}
            required
          />
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="bg-secondary"
            minLength={6}
            required
          />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "..." : "Update Password"}
          </Button>
        </form>
      )}
    </div>
  );
}

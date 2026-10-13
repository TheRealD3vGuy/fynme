import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — Find Your North" },
      { name: "description", content: "Your Find Your North account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          Your Account
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sign in to view your orders and account details.
        </p>
        <Button asChild className="mt-8" size="lg">
          <Link to="/auth">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        My Account
      </h1>
      <div className="mt-8 border border-border bg-card p-6">
        <p className="section-label text-xs text-muted-foreground">Signed in as</p>
        <p className="mt-1 text-lg">{user.email}</p>
      </div>
      <div className="mt-6 border border-border bg-card p-6">
        <p className="section-label text-xs text-muted-foreground">Orders</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your order history will appear here once you place your first order.
        </p>
      </div>
      <ChangePasswordCard />
      <Button
        variant="outline"
        className="mt-8"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/" });
        }}
      >
        Sign Out
      </Button>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="mt-6 border border-border bg-card p-6">
      <p className="section-label text-xs text-muted-foreground">Security</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Change the password you use to sign in.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="bg-secondary"
          required
        />
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="bg-secondary"
          minLength={6}
          required
        />
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="bg-secondary"
          minLength={6}
          required
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}

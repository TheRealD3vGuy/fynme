import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Staff — Find Your North" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: staff } = await supabase.rpc("is_staff");
        setIsStaff(Boolean(staff));
      } else {
        setIsStaff(null);
      }
    });
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? "Sign-in failed.");
      return;
    }
    const { data: staff } = await supabase.rpc("is_staff");
    setIsStaff(Boolean(staff));
    setUser(data.user);
    setLoading(false);
    if (!staff) {
      toast.error("This account does not have staff access.");
    }
  }

  // Signed in + verified staff
  if (user && isStaff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="section-label text-sm text-muted-foreground">
          Find Your North
        </p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-wide">
          Staff Panel
        </h1>
        <p className="mt-3 text-muted-foreground">
          Signed in as {user.email}. The full management panel — products,
          orders, content, and settings — is being built next.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {[
            "Products & Inventory",
            "Orders",
            "Customers",
            "Contact Inbox",
            "Pages & Content",
            "Site Settings",
          ].map((label) => (
            <div
              key={label}
              className="border border-border bg-card p-5 text-muted-foreground"
            >
              <p className="font-display text-xl font-semibold uppercase tracking-wide text-foreground">
                {label}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider">
                Coming soon
              </p>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="mt-10"
          onClick={async () => {
            await supabase.auth.signOut();
            setUser(null);
            setIsStaff(null);
          }}
        >
          Sign Out
        </Button>
      </div>
    );
  }

  // Signed in but not staff
  if (user && isStaff === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          No Staff Access
        </h1>
        <p className="mt-3 text-muted-foreground">
          This account doesn't have staff permissions. If you believe this is a
          mistake, contact the store owner.
        </p>
        <Button
          variant="outline"
          className="mt-8"
          onClick={async () => {
            await supabase.auth.signOut();
            setUser(null);
            setIsStaff(null);
          }}
        >
          Sign Out
        </Button>
      </div>
    );
  }

  // Staff sign-in
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <p className="section-label text-sm text-muted-foreground">
        Find Your North
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide">
        Staff Sign In
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Staff accounts are created by invitation only. There is no public
        sign-up.
      </p>
      <form onSubmit={signIn} className="mt-8 space-y-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@email.com"
          className="bg-secondary"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="bg-secondary"
          required
        />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "..." : "Sign In"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-accent hover:underline">
          Back to the store
        </Link>
      </p>
    </div>
  );
}

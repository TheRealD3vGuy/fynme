import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff — Find Your North" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/inventory", label: "Inventory" },
  { to: "/admin/collections", label: "Collections" },
  { to: "/admin/homepage", label: "Homepage" },
  { to: "/admin/pages", label: "Pages" },
  { to: "/admin/navigation", label: "Menus & Footer" },
] as const;

function AdminLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function check(u: User | null) {
    setUser(u);
    if (u) {
      const { data, error } = await supabase.rpc("is_staff", { _user_id: u.id });
      if (error) console.error("is_staff check failed:", error.message);
      setIsStaff(Boolean(data));
    } else setIsStaff(null);
    setChecked(true);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => check(data.user));
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error || !data.user) {
      toast.error(error?.message ?? "Sign-in failed.");
      return;
    }
    await check(data.user);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsStaff(null);
  }

  if (!checked) return <div className="py-24 text-center text-muted-foreground">Loading...</div>;

  if (user && isStaff) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <p className="section-label text-xs text-muted-foreground">Staff Panel</p>
          <nav className="mt-4 flex flex-wrap gap-1 md:flex-col">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/admin" }}
                className="px-3 py-2 font-display text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-card text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 truncate text-xs text-muted-foreground">{user.email}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={signOut}>
            Sign Out
          </Button>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  if (user && isStaff === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">No Staff Access</h1>
        <p className="mt-3 text-muted-foreground">
          This account doesn't have staff permissions. If you believe this is a mistake, contact the store owner.
        </p>
        <Button variant="outline" className="mt-8" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <p className="section-label text-sm text-muted-foreground">Find Your North</p>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide">Staff Sign In</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Staff accounts are created by invitation only. There is no public sign-up.
      </p>
      <form onSubmit={signIn} className="mt-8 space-y-4">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@email.com" className="bg-secondary" required />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="bg-secondary" required />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "..." : "Sign In"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-accent hover:underline">Back to the store</Link>
      </p>
    </div>
  );
}

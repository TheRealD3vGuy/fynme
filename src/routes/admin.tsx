import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Boxes, Download, Factory, FileText, Home, Inbox, Layers, LayoutDashboard,
  LogOut, Menu, Printer, Shirt, ShoppingBag, Tag,
} from "lucide-react";

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

const NAV_GROUPS = [
  {
    label: "Sales",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard },
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/receipts", label: "Receipt Printer", icon: Printer },
      { to: "/admin/inbox", label: "Inbox", icon: Inbox },
      { to: "/admin/discounts", label: "Promo Codes", icon: Tag },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Shirt },
      { to: "/admin/inventory", label: "Inventory", icon: Boxes },
      { to: "/admin/printify", label: "Printify", icon: Factory },
      { to: "/admin/collections", label: "Collections", icon: Layers },
    ],
  },
  {
    label: "Site",
    items: [
      { to: "/admin/homepage", label: "Homepage", icon: Home },
      { to: "/admin/pages", label: "Pages", icon: FileText },
      { to: "/admin/navigation", label: "Menus & Footer", icon: Menu },
      { to: "/admin/export", label: "Export & Guide", icon: Download },
    ],
  },
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
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:gap-10">
        <aside className="md:sticky md:top-24 md:h-[calc(100vh-7rem)] md:w-60 md:shrink-0">
          <div className="flex h-full flex-col border border-border bg-secondary">
            <div className="border-b border-border px-4 py-4">
              <p className="section-label text-[11px] text-accent">Find Your North</p>
              <p className="font-display text-xl font-bold uppercase tracking-wide">Staff Panel</p>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {NAV_GROUPS.map((g) => (
                <div key={g.label} className="mb-4">
                  <p className="section-label px-2 pb-1 text-[10px] text-muted-foreground">{g.label}</p>
                  <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 md:grid-cols-1">
                    {g.items.map((n) => (
                      <Link
                        key={n.to}
                        to={n.to}
                        activeOptions={{ exact: n.to === "/admin" }}
                        className="flex items-center gap-2.5 border-l-2 border-transparent px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                        activeProps={{ className: "!border-accent bg-card !text-foreground" }}
                      >
                        <n.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{n.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-border p-3">
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
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

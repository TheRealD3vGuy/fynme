import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [p, v, a] = await Promise.all([
        supabase.from("products").select("id, is_published"),
        supabase.from("product_variants").select("stock"),
        supabase.from("activity_log").select("id, summary, created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      const variants = v.data ?? [];
      return {
        products: p.data?.length ?? 0,
        published: (p.data ?? []).filter((x) => x.is_published).length,
        lowStock: variants.filter((x) => x.stock > 0 && x.stock <= 5).length,
        soldOut: variants.filter((x) => x.stock === 0).length,
        activity: a.data ?? [],
      };
    },
  });

  const stats = [
    ["Products", data?.products],
    ["Published", data?.published],
    ["Low stock sizes", data?.lowStock],
    ["Sold out sizes", data?.soldOut],
  ] as const;

  return (
    <div>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Overview</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-3xl font-bold">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 font-display text-xl font-semibold uppercase tracking-wide">Recent Activity</h2>
      <ul className="mt-3 divide-y divide-border border border-border">
        {(data?.activity ?? []).length === 0 && <li className="p-4 text-sm text-muted-foreground">No activity yet.</li>}
        {data?.activity.map((a) => (
          <li key={a.id} className="flex justify-between gap-4 p-3 text-sm">
            <span>{a.summary}</span>
            <span className="shrink-0 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/navigation")({
  component: NavigationAdmin,
});

function NavigationAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "nav"],
    queryFn: async () => (await supabase.from("navigation_items").select("*").order("location").order("position")).data ?? [],
  });

  const groups = Array.from(new Set((data ?? []).map((n) => n.location)));

  async function update(id: string, patch: { label?: string; href?: string; position?: number; is_visible?: boolean }) {
    const { error } = await supabase.from("navigation_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity("update", "navigation", id, "Updated a menu link");
    qc.invalidateQueries();
  }

  async function add(location: string) {
    const pos = (data ?? []).filter((n) => n.location === location).length;
    const { error } = await supabase.from("navigation_items").insert({ location, label: "New link", href: "/", position: pos });
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
  }

  async function remove(id: string) {
    if (!confirm("Remove this link?")) return;
    await supabase.from("navigation_items").delete().eq("id", id);
    await logActivity("delete", "navigation", id, "Removed a menu link");
    qc.invalidateQueries();
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Menus & Footer</h1>
      <p className="mt-2 text-sm text-muted-foreground">Edit text or links, then click away to save. Changes go live right away.</p>
      {groups.map((g) => (
        <section key={g} className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="section-label text-sm text-muted-foreground">{g.replace(/_/g, " ")}</h2>
            <Button size="sm" variant="outline" onClick={() => add(g)}>Add link</Button>
          </div>
          <div className="mt-3 divide-y divide-border border border-border">
            {(data ?? []).filter((n) => n.location === g).map((n) => (
              <div key={n.id} className="flex flex-wrap items-center gap-2 p-3">
                <Input className="w-16" type="number" defaultValue={n.position} onBlur={(e) => Number(e.target.value) !== n.position && update(n.id, { position: Number(e.target.value) })} />
                <Input className="w-40" defaultValue={n.label} onBlur={(e) => e.target.value !== n.label && update(n.id, { label: e.target.value })} />
                <Input className="min-w-40 flex-1" defaultValue={n.href} onBlur={(e) => e.target.value !== n.href && update(n.id, { href: e.target.value })} />
                <Switch checked={n.is_visible} onCheckedChange={(v) => update(n.id, { is_visible: v })} />
                <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>✕</Button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

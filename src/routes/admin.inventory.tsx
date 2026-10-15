import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryAdmin,
});

function InventoryAdmin() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const { data } = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, name, sku, stock, position, products(name)")
        .order("product_id")
        .order("position");
      return data ?? [];
    },
  });

  async function saveRow(id: string, current: number, label: string) {
    const next = parseInt(edits[id] ?? "", 10);
    if (Number.isNaN(next) || next === current) return;
    const { error } = await supabase.from("product_variants").update({ stock: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("inventory_adjustments").insert({ variant_id: id, delta: next - current, reason: "manual" });
    await logActivity("adjust", "inventory", id, `Stock for ${label}: ${current} → ${next}`);
    setEdits((e) => { const c = { ...e }; delete c[id]; return c; });
    toast.success("Stock updated.");
    qc.invalidateQueries();
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Inventory</h1>
      <p className="mt-2 text-sm text-muted-foreground">Change a number and press Save. Every change is recorded.</p>
      <div className="mt-6 divide-y divide-border border border-border">
        {(data ?? []).map((v) => {
          const label = `${v.products?.name ?? "?"} / ${v.name}`;
          const val = edits[v.id] ?? String(v.stock);
          return (
            <div key={v.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {v.sku || "No SKU"}
                  {v.stock === 0 ? " · Sold out" : v.stock <= 5 ? " · Low stock" : ""}
                </p>
              </div>
              <Input className="w-24" type="number" value={val} onChange={(e) => setEdits({ ...edits, [v.id]: e.target.value })} />
              <Button size="sm" variant="outline" disabled={val === String(v.stock)} onClick={() => saveRow(v.id, v.stock, label)}>Save</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

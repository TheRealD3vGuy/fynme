import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/format";
import { dollarsToCents, logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/discounts")({ component: DiscountsPage });

function DiscountsPage() {
  const qc = useQueryClient();
  const [f, setF] = useState({ code: "", type: "percent", value: "", min: "", limit: "", expires: "" });
  const { data } = useQuery({
    queryKey: ["admin-discounts"],
    queryFn: async () => (await supabase.from("discounts").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-discounts"] });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const code = f.code.trim().toUpperCase();
    if (!code || !f.value) { toast.error("Code and value are required."); return; }
    const value = f.type === "percent" ? Math.min(100, parseInt(f.value, 10)) : dollarsToCents(f.value);
    const { data: row, error } = await supabase.from("discounts").insert({
      code, type: f.type, value,
      min_order_cents: f.min ? dollarsToCents(f.min) : null,
      usage_limit: f.limit ? parseInt(f.limit, 10) : null,
      expires_at: f.expires ? new Date(f.expires).toISOString() : null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await logActivity("create", "discount", row.id, `Created code ${code}`);
    setF({ code: "", type: "percent", value: "", min: "", limit: "", expires: "" });
    refresh();
  }
  async function toggle(id: string, is_active: boolean) {
    await supabase.from("discounts").update({ is_active }).eq("id", id);
    refresh();
  }
  async function remove(id: string, code: string) {
    if (!confirm(`Delete ${code}?`)) return;
    const { error } = await supabase.from("discounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("delete", "discount", id, `Deleted code ${code}`);
    refresh();
  }

  return (
    <div>
      <p className="section-label text-xs text-muted-foreground">Marketing</p>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Promo Codes</h1>
      <form onSubmit={create} className="mt-6 grid gap-2 border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-7">
        <Input placeholder="CODE" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="bg-secondary uppercase" />
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="h-10 border border-border bg-secondary px-2 text-sm">
          <option value="percent">% off</option><option value="amount">$ off</option>
        </select>
        <Input placeholder={f.type === "percent" ? "10" : "5.00"} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className="bg-secondary" />
        <Input placeholder="Min order $" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} className="bg-secondary" />
        <Input placeholder="Usage limit" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} className="bg-secondary" />
        <Input type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} className="bg-secondary" />
        <Button type="submit">Create</Button>
      </form>
      <div className="mt-6 divide-y divide-border border border-border">
        {(data ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">No codes yet.</p>}
        {(data ?? []).map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-4 p-3 text-sm">
            <span className="w-32 font-display text-lg">{d.code}</span>
            <span className="flex-1 text-muted-foreground">
              {d.type === "percent" ? `${d.value}% off` : `${formatPrice(d.value)} off`}
              {d.min_order_cents ? ` · min ${formatPrice(d.min_order_cents)}` : ""}
              {` · used ${d.times_used}${d.usage_limit ? `/${d.usage_limit}` : ""}`}
              {d.expires_at ? ` · expires ${new Date(d.expires_at).toLocaleDateString()}` : ""}
            </span>
            <Switch checked={d.is_active} onCheckedChange={(v) => toggle(d.id, v)} aria-label="Active" />
            <Button size="sm" variant="outline" onClick={() => remove(d.id, d.code)}>Delete</Button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Codes can be applied in the Receipt Printer now, and at online checkout once payments are connected.</p>
    </div>
  );
}

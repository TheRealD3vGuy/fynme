import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/homepage")({
  component: HomepageAdmin,
});

type Obj = Record<string, Json>;

const HERO_FIELDS = [
  ["heading", "Big heading"],
  ["subtitle", "Subtitle"],
  ["cta_text", "Button text"],
  ["cta_href", "Button link"],
  ["image_url", "Background photo link"],
] as const;
const STORE_FIELDS = [
  ["name", "Store name"],
  ["tagline", "Tagline"],
  ["contact_email", "Contact email"],
] as const;
const SECTIONS = [
  ["featured_enabled", "Featured products"],
  ["wholesale_enabled", "Wholesale banner"],
  ["series_enabled", "Shop by series"],
  ["stickers_enabled", "Stickers"],
  ["newsletter_enabled", "Newsletter signup"],
] as const;

function HomepageAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const m: Record<string, Obj> = {};
      (data ?? []).forEach((r) => (m[r.key] = (r.value as Obj) ?? {}));
      return m;
    },
  });
  const [s, setS] = useState<Record<string, Obj>>({});
  useEffect(() => { if (data) setS(data); }, [data]);

  const val = (k: string, f: string) => s[k]?.[f];
  const setVal = (k: string, f: string, v: Json) => setS((p) => ({ ...p, [k]: { ...(p[k] ?? {}), [f]: v } }));

  async function save() {
    for (const key of ["hero", "homepage", "store"]) {
      const { error } = await supabase.from("site_settings").upsert({ key, value: s[key] ?? {}, updated_at: new Date().toISOString() });
      if (error) return toast.error(error.message);
    }
    await logActivity("update", "settings", null, "Updated homepage & store settings");
    toast.success("Published to the live site.");
    qc.invalidateQueries();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Homepage</h1>
      <h2 className="mt-8 section-label text-sm text-muted-foreground">Top banner</h2>
      <div className="mt-3 space-y-3">
        {HERO_FIELDS.map(([f, l]) => (
          <div key={f}><Label>{l}</Label><Input value={String(val("hero", f) ?? "")} onChange={(e) => setVal("hero", f, e.target.value)} /></div>
        ))}
        <div>
          <Label>Photo darkness (0–1)</Label>
          <Input type="number" step="0.05" min="0" max="1" value={String(val("hero", "overlay") ?? 0.45)} onChange={(e) => setVal("hero", "overlay", parseFloat(e.target.value || "0"))} />
        </div>
      </div>
      <h2 className="mt-8 section-label text-sm text-muted-foreground">Sections shown</h2>
      <div className="mt-3 space-y-3">
        {SECTIONS.map(([f, l]) => (
          <label key={f} className="flex items-center gap-3 text-sm">
            <Switch checked={val("homepage", f) !== false} onCheckedChange={(v) => setVal("homepage", f, v)} /> {l}
          </label>
        ))}
        <div><Label>Featured heading</Label><Input value={String(val("homepage", "featured_heading") ?? "")} onChange={(e) => setVal("homepage", "featured_heading", e.target.value)} /></div>
      </div>
      <h2 className="mt-8 section-label text-sm text-muted-foreground">Store info</h2>
      <div className="mt-3 space-y-3">
        {STORE_FIELDS.map(([f, l]) => (
          <div key={f}><Label>{l}</Label><Input value={String(val("store", f) ?? "")} onChange={(e) => setVal("store", f, e.target.value)} /></div>
        ))}
      </div>
      <Button className="mt-8" size="lg" onClick={save}>Save & Publish</Button>
    </div>
  );
}

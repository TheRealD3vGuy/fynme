import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { slugify, logActivity, dollarsToCents, centsToDollars } from "@/lib/admin";

export const Route = createFileRoute("/admin/products")({
  component: ProductsAdmin,
});

interface Variant { id?: string; name: string; sku: string; stock: number }
interface Form {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compare: string;
  collection_id: string;
  category_id: string;
  tags: string;
  image_url: string;
  is_published: boolean;
  is_featured: boolean;
  is_new: boolean;
  variants: Variant[];
}

const empty: Form = {
  name: "", slug: "", description: "", price: "", compare: "", collection_id: "", category_id: "",
  tags: "", image_url: "", is_published: false, is_featured: false, is_new: true,
  variants: ["S", "M", "L", "XL", "XXL"].map((n) => ({ name: n, sku: "", stock: 0 })),
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const [p, c, cat] = await Promise.all([
        supabase.from("products")
          .select("*, product_images(id, url, position), product_variants(id, name, sku, stock, position), collections(name)")
          .order("created_at", { ascending: false }),
        supabase.from("collections").select("id, name").order("position"),
        supabase.from("categories").select("id, name"),
      ]);
      return { products: p.data ?? [], collections: c.data ?? [], categories: cat.data ?? [] };
    },
  });

  type Row = NonNullable<typeof data>["products"][number];

  function edit(p: Row) {
    const imgs = [...p.product_images].sort((a, b) => a.position - b.position);
    setForm({
      id: p.id, name: p.name, slug: p.slug, description: p.description ?? "",
      price: centsToDollars(p.price_cents), compare: centsToDollars(p.compare_at_price_cents),
      collection_id: p.collection_id ?? "", category_id: p.category_id ?? "", tags: p.tags.join(", "),
      image_url: imgs[0]?.url ?? "", is_published: p.is_published, is_featured: p.is_featured, is_new: p.is_new,
      variants: [...p.product_variants].sort((a, b) => a.position - b.position)
        .map((v) => ({ id: v.id, name: v.name, sku: v.sku ?? "", stock: v.stock })),
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Name is required.");
    setSaving(true);
    const row = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description || null,
      price_cents: dollarsToCents(form.price),
      compare_at_price_cents: form.compare ? dollarsToCents(form.compare) : null,
      collection_id: form.collection_id || null,
      category_id: form.category_id || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      is_published: form.is_published, is_featured: form.is_featured, is_new: form.is_new,
      updated_at: new Date().toISOString(),
    };
    try {
      let id = form.id;
      if (id) {
        const { error } = await supabase.from("products").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("products").insert(row).select("id").single();
        if (error) throw error;
        id = ins.id;
      }
      // image (first photo)
      const { data: imgs } = await supabase.from("product_images").select("id, position").eq("product_id", id).order("position");
      const first = imgs?.[0];
      if (form.image_url) {
        if (first) await supabase.from("product_images").update({ url: form.image_url, alt: row.name }).eq("id", first.id);
        else await supabase.from("product_images").insert({ product_id: id, url: form.image_url, alt: row.name, position: 0 });
      } else if (first) {
        await supabase.from("product_images").delete().eq("id", first.id);
      }
      // variants
      const keep = form.variants.filter((v) => v.id).map((v) => v.id as string);
      const existing = data?.products.find((p) => p.id === id)?.product_variants ?? [];
      const removed = existing.filter((v) => !keep.includes(v.id)).map((v) => v.id);
      if (removed.length) await supabase.from("product_variants").delete().in("id", removed);
      for (const [i, v] of form.variants.entries()) {
        const vr = { name: v.name, sku: v.sku || null, stock: v.stock, position: i };
        if (v.id) await supabase.from("product_variants").update(vr).eq("id", v.id);
        else if (v.name.trim()) await supabase.from("product_variants").insert({ ...vr, product_id: id });
      }
      await logActivity(form.id ? "update" : "create", "product", id, `${form.id ? "Updated" : "Created"} product "${row.name}"`);
      toast.success("Product saved.");
      setForm(null);
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Row) {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    await supabase.from("product_images").delete().eq("product_id", p.id);
    await supabase.from("product_variants").delete().eq("product_id", p.id);
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await logActivity("delete", "product", p.id, `Deleted product "${p.name}"`);
    toast.success("Product deleted.");
    qc.invalidateQueries();
  }

  const list = (data?.products ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Products</h1>
        <Button onClick={() => setForm({ ...empty, variants: empty.variants.map((v) => ({ ...v })) })}>New Product</Button>
      </div>
      <Input className="mt-6 max-w-sm bg-secondary" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-4 divide-y divide-border border border-border">
        {list.map((p) => {
          const img = [...p.product_images].sort((a, b) => a.position - b.position)[0];
          const stock = p.product_variants.reduce((s, v) => s + v.stock, 0);
          return (
            <div key={p.id} className="flex items-center gap-4 p-3">
              <div className="h-14 w-14 shrink-0 bg-secondary">
                {img && <img src={img.url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg uppercase tracking-wide">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  ${centsToDollars(p.price_cents)} · {p.collections?.name ?? "No series"} · {stock} in stock ·{" "}
                  <span className={p.is_published ? "text-accent" : ""}>{p.is_published ? "Published" : "Draft"}</span>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => edit(p)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p)}>Delete</Button>
            </div>
          );
        })}
        {list.length === 0 && <p className="p-4 text-sm text-muted-foreground">No products found.</p>}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wide">{form?.id ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
                <div><Label>Web address (slug)</Label><Input value={form.slug} placeholder={slugify(form.name)} onChange={(e) => set({ slug: slugify(e.target.value) })} /></div>
                <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => set({ price: e.target.value })} /></div>
                <div><Label>Original price if on sale ($)</Label><Input type="number" step="0.01" value={form.compare} onChange={(e) => set({ compare: e.target.value })} /></div>
                <div>
                  <Label>Series</Label>
                  <select className="h-10 w-full border border-input bg-background px-3 text-sm" value={form.collection_id} onChange={(e) => set({ collection_id: e.target.value })}>
                    <option value="">None</option>
                    {data?.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Category</Label>
                  <select className="h-10 w-full border border-input bg-background px-3 text-sm" value={form.category_id} onChange={(e) => set({ category_id: e.target.value })}>
                    <option value="">None</option>
                    {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>
              <div><Label>Tags (comma separated — use "sticker" for stickers)</Label><Input value={form.tags} onChange={(e) => set({ tags: e.target.value })} /></div>
              <div>
                <Label>Photo link</Label>
                <Input value={form.image_url} placeholder="https://..." onChange={(e) => set({ image_url: e.target.value })} />
                {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 w-24 object-cover" />}
              </div>
              <div className="flex flex-wrap gap-6">
                {(["is_published", "is_featured", "is_new"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Switch checked={form[k]} onCheckedChange={(v) => set({ [k]: v })} />
                    {k === "is_published" ? "Published" : k === "is_featured" ? "Featured" : "New"}
                  </label>
                ))}
              </div>
              <div>
                <Label>Sizes & stock</Label>
                <div className="mt-2 space-y-2">
                  {form.variants.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <Input className="w-28" value={v.name} placeholder="Size" onChange={(e) => set({ variants: form.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                      <Input value={v.sku} placeholder="SKU" onChange={(e) => set({ variants: form.variants.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)) })} />
                      <Input className="w-24" type="number" value={v.stock} onChange={(e) => set({ variants: form.variants.map((x, j) => (j === i ? { ...x, stock: parseInt(e.target.value || "0", 10) } : x)) })} />
                      <Button variant="ghost" size="sm" onClick={() => set({ variants: form.variants.filter((_, j) => j !== i) })}>✕</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => set({ variants: [...form.variants, { name: "", sku: "", stock: 0 }] })}>Add size</Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Product"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

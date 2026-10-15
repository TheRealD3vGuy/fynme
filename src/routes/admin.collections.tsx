import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { slugify, logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/collections")({
  component: CollectionsAdmin,
});

interface Col { id?: string; name: string; slug: string; description: string; cover_image_url: string; position: number; is_published: boolean; is_featured: boolean }

function CollectionsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Col | null>(null);
  const { data } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: async () => (await supabase.from("collections").select("*").order("position")).data ?? [],
  });

  async function save() {
    if (!editing?.name.trim()) { toast.error("Name is required."); return; }
    const row = {
      name: editing.name.trim(), slug: editing.slug || slugify(editing.name),
      description: editing.description || null, cover_image_url: editing.cover_image_url || null,
      position: editing.position, is_published: editing.is_published, is_featured: editing.is_featured,
    };
    const { error } = editing.id
      ? await supabase.from("collections").update(row).eq("id", editing.id)
      : await supabase.from("collections").insert(row);
    if (error) { toast.error(error.message); return; }
    await logActivity(editing.id ? "update" : "create", "collection", editing.id ?? null, `Saved series "${row.name}"`);
    toast.success("Series saved.");
    setEditing(null);
    qc.invalidateQueries();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete series "${name}"? Products in it will stay but lose their series.`)) return;
    await supabase.from("products").update({ collection_id: null }).eq("collection_id", id);
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("delete", "collection", id, `Deleted series "${name}"`);
    qc.invalidateQueries();
  }

  const set = (p: Partial<Col>) => setEditing((e) => (e ? { ...e, ...p } : e));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Collections</h1>
        <Button onClick={() => setEditing({ name: "", slug: "", description: "", cover_image_url: "", position: (data?.length ?? 0), is_published: true, is_featured: false })}>New Series</Button>
      </div>
      {editing && (
        <div className="mt-6 space-y-3 border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Name" value={editing.name} onChange={(e) => set({ name: e.target.value })} />
            <Input placeholder={slugify(editing.name) || "web-address"} value={editing.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} />
            <Input placeholder="Cover photo link" value={editing.cover_image_url} onChange={(e) => set({ cover_image_url: e.target.value })} />
            <Input type="number" placeholder="Order" value={editing.position} onChange={(e) => set({ position: parseInt(e.target.value || "0", 10) })} />
          </div>
          <Textarea placeholder="Description" value={editing.description} onChange={(e) => set({ description: e.target.value })} />
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2"><Switch checked={editing.is_published} onCheckedChange={(v) => set({ is_published: v })} /> Published</label>
            <label className="flex items-center gap-2"><Switch checked={editing.is_featured} onCheckedChange={(v) => set({ is_featured: v })} /> Featured</label>
          </div>
          <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>
      )}
      <div className="mt-6 divide-y divide-border border border-border">
        {(data ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg uppercase tracking-wide">{c.name}</p>
              <p className="text-xs text-muted-foreground">/{c.slug} · {c.is_published ? "Published" : "Hidden"}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", cover_image_url: c.cover_image_url ?? "", position: c.position, is_published: c.is_published, is_featured: c.is_featured })}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(c.id, c.name)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

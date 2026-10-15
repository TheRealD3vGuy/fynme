import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { slugify, logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/pages")({
  component: PagesAdmin,
});

interface Section { id?: string; heading: string; body: string; is_visible: boolean }
interface PageForm { id?: string; title: string; slug: string; status: string; seo_title: string; seo_description: string; sections: Section[] }

function PagesAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PageForm | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const { data } = useQuery({
    queryKey: ["admin", "pages"],
    queryFn: async () =>
      (await supabase.from("pages").select("*, page_sections(id, type, content, position, is_visible)").order("title")).data ?? [],
  });
  type Row = NonNullable<typeof data>[number];

  function open(p: Row | null) {
    setRemoved([]);
    if (!p) { setForm({ title: "", slug: "", status: "draft", seo_title: "", seo_description: "", sections: [{ heading: "", body: "", is_visible: true }] }); return; }
    setForm({
      id: p.id, title: p.title, slug: p.slug, status: p.status, seo_title: p.seo_title ?? "", seo_description: p.seo_description ?? "",
      sections: [...p.page_sections].sort((a, b) => a.position - b.position).map((s) => {
        const c = (s.content ?? {}) as { heading?: string; body?: string };
        return { id: s.id, heading: c.heading ?? "", body: c.body ?? "", is_visible: s.is_visible };
      }),
    });
  }

  async function save(status: string) {
    if (!form?.title.trim()) { toast.error("Title is required."); return; }
    const row = {
      title: form.title.trim(), slug: form.slug || slugify(form.title), status,
      seo_title: form.seo_title || null, seo_description: form.seo_description || null, updated_at: new Date().toISOString(),
    };
    let id = form.id;
    if (id) {
      const { error } = await supabase.from("pages").update(row).eq("id", id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data: ins, error } = await supabase.from("pages").insert(row).select("id").single();
      if (error) { toast.error(error.message); return; }
      id = ins.id;
    }
    if (removed.length) await supabase.from("page_sections").delete().in("id", removed);
    for (const [i, s] of form.sections.entries()) {
      const sr = { type: "text", content: { heading: s.heading, body: s.body }, position: i, is_visible: s.is_visible };
      if (s.id) await supabase.from("page_sections").update(sr).eq("id", s.id);
      else await supabase.from("page_sections").insert({ ...sr, page_id: id });
    }
    await logActivity("update", "page", id, `${status === "published" ? "Published" : "Saved draft of"} page "${row.title}"`);
    toast.success(status === "published" ? "Page published." : "Draft saved.");
    setForm(null);
    qc.invalidateQueries();
  }

  async function remove(p: Row) {
    if (!confirm(`Delete page "${p.title}"?`)) return;
    await supabase.from("page_sections").delete().eq("page_id", p.id);
    const { error } = await supabase.from("pages").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("delete", "page", p.id, `Deleted page "${p.title}"`);
    qc.invalidateQueries();
  }

  const set = (p: Partial<PageForm>) => setForm((f) => (f ? { ...f, ...p } : f));
  const setSec = (i: number, p: Partial<Section>) => form && set({ sections: form.sections.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const move = (i: number, d: number) => {
    if (!form) return;
    const arr = [...form.sections];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    set({ sections: arr });
  };

  if (form) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">{form.id ? "Edit Page" : "New Page"}</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => set({ title: e.target.value })} /></div>
          <div><Label>Web address</Label><Input value={form.slug} placeholder={slugify(form.title)} onChange={(e) => set({ slug: slugify(e.target.value) })} /></div>
          <div><Label>Search engine title</Label><Input value={form.seo_title} onChange={(e) => set({ seo_title: e.target.value })} /></div>
          <div><Label>Search engine description</Label><Input value={form.seo_description} onChange={(e) => set({ seo_description: e.target.value })} /></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Lives at /pages/{form.slug || slugify(form.title)}{form.slug === "about" ? " (and the About page)" : ""}
        </p>
        <h2 className="mt-8 section-label text-sm text-muted-foreground">Sections</h2>
        <div className="mt-3 space-y-4">
          {form.sections.map((s, i) => (
            <div key={i} className="space-y-2 border border-border bg-card p-4">
              <Input placeholder="Heading (optional)" value={s.heading} onChange={(e) => setSec(i, { heading: e.target.value })} />
              <Textarea rows={5} placeholder="Text" value={s.body} onChange={(e) => setSec(i, { body: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
                <Button size="sm" variant="ghost" onClick={() => setSec(i, { is_visible: !s.is_visible })}>{s.is_visible ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (s.id) setRemoved([...removed, s.id]); set({ sections: form.sections.filter((_, j) => j !== i) }); }}>Remove</Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={() => set({ sections: [...form.sections, { heading: "", body: "", is_visible: true }] })}>Add section</Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button onClick={() => save("published")}>Publish</Button>
          <Button variant="outline" onClick={() => save("draft")}>Save as Draft</Button>
          <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Pages</h1>
        <Button onClick={() => open(null)}>New Page</Button>
      </div>
      <div className="mt-6 divide-y divide-border border border-border">
        {(data ?? []).map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg uppercase tracking-wide">{p.title}</p>
              <p className="text-xs text-muted-foreground">/pages/{p.slug} · {p.status === "published" ? "Published" : "Draft"}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => open(p)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(p)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

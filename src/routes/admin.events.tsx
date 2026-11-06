import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageDrop } from "@/components/admin/ImageDrop";
import { listPrivateEvents, lockPrivateEvent, savePrivateEvent } from "@/lib/events.functions";
import { heroSchema, type EventDraft } from "@/lib/events";

export const Route = createFileRoute("/admin/events")({
  head: () => ({
    meta: [
      { title: "Private Events Staff — Find Your North" },
      { name: "description", content: "Staff management of invitation-only Find Your North events." },
      { property: "og:title", content: "Private Events Staff — Find Your North" },
      { property: "og:description", content: "Staff management of invitation-only Find Your North events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EventsAdmin,
});

type Row = NonNullable<Awaited<ReturnType<typeof listPrivateEvents>>>[number];
type Detail = { heading: string; text: string };

// Form keeps dates as datetime-local strings; converted to ISO on save.
interface EventForm {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location_name: string;
  address: string;
  contact_email: string;
  details: Detail[];
  hero: EventDraft["hero"];
  is_published: boolean;
  code: string;
}

const blankHero: EventDraft["hero"] = { media_type: "image", image_url: "", video_url: "", slides: [], slide_seconds: 5, overlay: 0.45 };

const blank: EventForm = {
  title: "", subtitle: "", description: "", starts_at: "", ends_at: "",
  timezone: "America/Los_Angeles", location_name: "", address: "", contact_email: "",
  details: [], hero: blankHero, is_published: false, code: "",
};

function toLocal(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function EventsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<EventForm | null>(null);
  const [saving, setSaving] = useState(false);
  const { data } = useQuery({ queryKey: ["admin", "private-events"], queryFn: () => listPrivateEvents() });

  function open(row: Row | null) {
    if (!row) { setForm({ ...blank, code: randomCode() }); return; }
    const hero = heroSchema.parse(row.hero ?? {});
    const details = Array.isArray(row.details) ? (row.details as Detail[]) : [];
    setForm({
      id: row.id, title: row.title, subtitle: row.subtitle ?? "", description: row.description ?? "",
      starts_at: toLocal(row.starts_at), ends_at: toLocal(row.ends_at), timezone: row.timezone,
      location_name: row.location_name ?? "", address: row.address ?? "", contact_email: row.contact_email ?? "",
      details, hero, is_published: row.is_published, code: "",
    });
  }

  const set = (p: Partial<EventForm>) => setForm((f) => (f ? { ...f, ...p } : f));
  const setHero = (p: Partial<EventDraft["hero"]>) => setForm((f) => (f ? { ...f, hero: { ...f.hero, ...p } } : f));
  const setDetail = (i: number, p: Partial<Detail>) => form && set({ details: form.details.map((d, j) => (j === i ? { ...d, ...p } : d)) });
  const moveDetail = (i: number, dir: number) => {
    if (!form) return;
    const arr = [...form.details];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    set({ details: arr });
  };

  async function save(publish: boolean) {
    if (!form) return;
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.starts_at || !form.ends_at) { toast.error("Start and end times are required."); return; }
    if (Date.parse(form.ends_at) <= Date.parse(form.starts_at)) { toast.error("Event end must be after its start."); return; }
    if (!form.id && !/^[A-Z0-9]{6}$/.test(form.code)) { toast.error("Invite code must be exactly six letters and numbers."); return; }
    setSaving(true);
    try {
      const payload: EventDraft = {
        ...(form.id ? { id: form.id } : {}),
        title: form.title.trim(), subtitle: form.subtitle, description: form.description,
        starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString(),
        timezone: form.timezone, location_name: form.location_name, address: form.address,
        contact_email: form.contact_email, details: form.details, hero: form.hero,
        is_published: publish, code: form.code,
      };
      await savePrivateEvent({ data: payload });
      toast.success(publish ? "Event published." : "Draft saved.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin", "private-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save event.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock(row: Row) {
    if (!row.is_locked && !confirm(`Lock "${row.title}"? Everyone viewing it is kicked off immediately and invite codes stop working until you unlock it.`)) return;
    try {
      await lockPrivateEvent({ data: { id: row.id, locked: !row.is_locked } });
      toast.success(row.is_locked ? "Event unlocked." : "Event locked — all guests signed out.");
      qc.invalidateQueries({ queryKey: ["admin", "private-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to change event access.");
    }
  }

  if (form) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">{form.id ? "Edit Event" : "New Event"}</h1>

        <h2 className="mt-8 section-label text-sm text-muted-foreground">Basics</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => set({ title: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Subtitle (optional)</Label><Input value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} /></div>
          <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} /></div>
          <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} /></div>
          <div><Label>Time zone</Label><Input value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} placeholder="America/Los_Angeles" /></div>
          <div><Label>Contact email (optional)</Label><Input type="email" value={form.contact_email} onChange={(e) => set({ contact_email: e.target.value })} /></div>
          <div><Label>Location name</Label><Input value={form.location_name} onChange={(e) => set({ location_name: e.target.value })} placeholder="The North Warehouse" /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Used for the Directions button" /></div>
        </div>
        <div className="mt-3"><Label>About the event</Label><Textarea rows={6} value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>

        <h2 className="mt-8 section-label text-sm text-muted-foreground">Invite code</h2>
        <div className="mt-3 flex items-center gap-2">
          <Input value={form.code} maxLength={6} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder={form.id ? "Leave blank to keep current code" : "6 letters/numbers"} className="w-48 font-mono uppercase" />
          <Button type="button" variant="outline" size="sm" onClick={() => set({ code: randomCode() })}>Generate</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Codes are stored scrambled and can't be viewed after saving — share it with guests when you create the event. Setting a new code replaces the old one.
        </p>

        <h2 className="mt-8 section-label text-sm text-muted-foreground">Header media</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {([["image", "Single photo"], ["slideshow", "Slideshow"], ["video", "Video"]] as const).map(([value, label]) => (
            <Button key={value} type="button" size="sm" variant={form.hero.media_type === value ? "default" : "outline"} onClick={() => setHero({ media_type: value })}>{label}</Button>
          ))}
        </div>
        <div className="mt-4 space-y-4">
          {form.hero.media_type === "image" && (
            <ImageDrop label="Header photo" value={form.hero.image_url ?? ""} onChange={(url) => setHero({ image_url: url })} bucket="event-media" privatePath />
          )}
          {form.hero.media_type === "video" && (
            <>
              <ImageDrop label="Header video" kind="video" value={form.hero.video_url ?? ""} onChange={(url) => setHero({ video_url: url })} bucket="event-media" privatePath />
              <ImageDrop label="Cover photo (shown while the video loads)" value={form.hero.image_url ?? ""} onChange={(url) => setHero({ image_url: url })} bucket="event-media" privatePath />
            </>
          )}
          {form.hero.media_type === "slideshow" && (
            <div className="space-y-3">
              {form.hero.slides.map((slide, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <ImageDrop label={`Slide ${i + 1}`} value={slide} onChange={(url) => setHero({ slides: form.hero.slides.map((s, j) => (j === i ? url : s)) })} bucket="event-media" privatePath />
                  </div>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove slide ${i + 1}`} onClick={() => setHero({ slides: form.hero.slides.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setHero({ slides: [...form.hero.slides, ""] })}><Plus className="h-4 w-4" /> Add slide</Button>
              <div className="w-48"><Label>Seconds per slide</Label><Input type="number" min={2} max={30} value={form.hero.slide_seconds} onChange={(e) => setHero({ slide_seconds: Number(e.target.value) || 5 })} /></div>
            </div>
          )}
          <div>
            <Label>Dark overlay over media — {Math.round((form.hero.overlay ?? 0.45) * 100)}%</Label>
            <input type="range" min={0} max={1} step={0.05} value={form.hero.overlay ?? 0.45} onChange={(e) => setHero({ overlay: Number(e.target.value) })} className="mt-2 w-full accent-accent" aria-label="Overlay darkness" />
          </div>
        </div>

        <h2 className="mt-8 section-label text-sm text-muted-foreground">Extra sections</h2>
        <div className="mt-3 space-y-4">
          {form.details.map((d, i) => (
            <div key={i} className="space-y-2 border border-border bg-card p-4">
              <Input placeholder="Heading" value={d.heading} onChange={(e) => setDetail(i, { heading: e.target.value })} />
              <Textarea rows={4} placeholder="Text" value={d.text} onChange={(e) => setDetail(i, { text: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" aria-label="Move section up" onClick={() => moveDetail(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Move section down" onClick={() => moveDetail(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => set({ details: form.details.filter((_, j) => j !== i) })}>Remove</Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set({ details: [...form.details, { heading: "", text: "" }] })}><Plus className="h-4 w-4" /> Add section</Button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button onClick={() => save(true)} disabled={saving}>{saving ? "Saving…" : "Publish"}</Button>
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>Save as Draft</Button>
          <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  const now = Date.now();
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Private Events</h1>
        <Button onClick={() => open(null)}>New Event</Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Guests enter at <span className="font-mono text-foreground">/privevents</span> with the six-character invite code you give them. The page is hidden from navigation and search engines.
      </p>
      <div className="mt-6 divide-y divide-border border border-border">
        {(data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No events yet. Create your first one.</p>}
        {(data ?? []).map((row) => {
          const ended = Date.parse(row.ends_at) <= now;
          return (
            <div key={row.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg uppercase tracking-wide">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(row.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} → {new Date(row.ends_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${row.is_published ? "border-accent text-accent" : "border-border text-muted-foreground"}`}>{row.is_published ? "Published" : "Draft"}</span>
                  {row.is_locked && <span className="border border-destructive px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-destructive">Locked</span>}
                  {ended && <span className="border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Ended</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => open(row)}>Edit</Button>
              <Button size="sm" variant={row.is_locked ? "outline" : "ghost"} onClick={() => toggleLock(row)}>
                {row.is_locked ? <><LockOpen className="h-4 w-4" /> Unlock</> : <><Lock className="h-4 w-4" /> Lock & kick out</>}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

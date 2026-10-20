import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/inbox")({ component: InboxPage });

const STATUSES = ["unread", "open", "resolved"];

function InboxPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data: msgs } = useQuery({
    queryKey: ["admin-inbox"],
    queryFn: async () => (await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: notes } = useQuery({
    queryKey: ["admin-inbox-notes", sel],
    enabled: !!sel,
    queryFn: async () => (await supabase.from("contact_notes").select("*").eq("submission_id", sel!).order("created_at")).data ?? [],
  });
  const list = (msgs ?? []).filter((m) => filter === "all" || m.status === filter);
  const m = msgs?.find((x) => x.id === sel);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("contact_submissions").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-inbox"] });
  }
  async function open(id: string, status: string) {
    setSel(id);
    if (status === "unread") await setStatus(id, "open");
  }
  async function addNote() {
    if (!sel || !note.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("contact_notes").insert({ submission_id: sel, note: note.trim(), author_id: u.user?.id ?? null });
    if (error) { toast.error(error.message); return; }
    setNote("");
    qc.invalidateQueries({ queryKey: ["admin-inbox-notes", sel] });
  }

  return (
    <div>
      <p className="section-label text-xs text-muted-foreground">Customers</p>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Contact Inbox</h1>
      <div className="mt-6 flex gap-2">
        {["all", ...STATUSES].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="capitalize" onClick={() => setFilter(f)}>
            {f}{f === "unread" ? ` (${(msgs ?? []).filter((x) => x.status === "unread").length})` : ""}
          </Button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="divide-y divide-border border border-border">
          {list.length === 0 && <p className="p-6 text-sm text-muted-foreground">No messages.</p>}
          {list.map((x) => (
            <button key={x.id} onClick={() => open(x.id, x.status)} className={`block w-full p-3 text-left text-sm hover:bg-card ${sel === x.id ? "bg-card" : ""}`}>
              <div className="flex justify-between">
                <span className={x.status === "unread" ? "font-bold" : ""}>{x.name}</span>
                <span className="text-xs text-muted-foreground">{new Date(x.created_at).toLocaleDateString()}</span>
              </div>
              <p className="truncate text-muted-foreground">{x.subject || x.message}</p>
              <span className="text-xs uppercase text-accent">{x.category} · {x.status}</span>
            </button>
          ))}
        </div>
        {m && (
          <div className="space-y-4 border border-border bg-card p-4">
            <div>
              <h2 className="font-display text-2xl uppercase">{m.subject || m.category}</h2>
              <p className="text-sm text-muted-foreground">
                {m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.order_number ? ` · Order ${m.order_number}` : ""}
              </p>
            </div>
            <p className="whitespace-pre-wrap text-sm">{m.message}</p>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <Button key={s} size="sm" variant={m.status === s ? "default" : "outline"} className="capitalize" onClick={() => setStatus(m.id, s)}>{s}</Button>
              ))}
              <Button size="sm" variant="outline" asChild><a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject ?? "Your message")}`}>Reply by email</a></Button>
            </div>
            <div className="border-t border-border pt-4">
              <p className="section-label text-xs text-muted-foreground">Private staff notes</p>
              {(notes ?? []).map((n) => (
                <p key={n.id} className="mt-2 border-l-2 border-accent pl-2 text-sm">{n.note}<span className="block text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span></p>
              ))}
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="mt-3 bg-secondary" />
              <Button size="sm" className="mt-2" onClick={addNote}>Add Note</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

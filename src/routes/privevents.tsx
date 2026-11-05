import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, Copy, LockKeyhole, LogOut, Mail, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventHero } from "@/components/store/EventHero";
import { enterEvent, getGuestEvent, leaveEvent } from "@/lib/events.functions";
import { eventCalendar, type EventView } from "@/lib/events";
import { toast } from "sonner";

export const Route = createFileRoute("/privevents")({
  head: () => ({ meta: [{ title: "Private Events — Find Your North" }, { name: "description", content: "Invitation-only gatherings at Find Your North." }, { property: "og:title", content: "Private Events — Find Your North" }, { property: "og:description", content: "Invitation-only gatherings at Find Your North." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow, noarchive" }] }),
  component: PrivateEvents,
});
function PrivateEvents() {
  const read = useServerFn(getGuestEvent), enter = useServerFn(enterEvent), leave = useServerFn(leaveEvent);
  const [event, setEvent] = useState<EventView | null>(null);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const revision = useRef(0);
  useEffect(() => {
    let alive = true;
    async function check() {
      const current = revision.current;
      try { const next = await read(); if (alive && current === revision.current) { setEvent(previous => { if (previous && !next) setMessage("This invitation is no longer active."); return next; }); } }
      catch { if (alive) { setEvent(null); setMessage("Unable to verify access. Please try again."); } }
      finally { if (alive) setChecking(false); }
    }
    void check();
    const timer = setInterval(check, 3000);
    const focus = () => { setEvent(null); void check(); };
    window.addEventListener("focus", focus);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [read]);
  useEffect(() => { if (!event) return; const timer = setTimeout(() => { revision.current++; setEvent(null); setMessage("This event has ended. Enter a new invite code to continue."); }, Math.min(2147483647, Math.max(0, Date.parse(event.ends_at) - Date.now()))); return () => clearTimeout(timer); }, [event]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); revision.current++;
    try { const result = await enter({ data: code }); if (!result.ok) { setEvent(null); setMessage("Invalid, locked, or expired invite code."); } else { setEvent(await read()); setCode(""); } }
    catch { setMessage("Unable to enter. Check your code and try again."); }
    finally { setBusy(false); }
  }
  function calendar() { if (!event) return; const url = URL.createObjectURL(new Blob([eventCalendar(event)], { type: "text/calendar;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "fyn-event.ics"; a.click(); URL.revokeObjectURL(url); }
  if (checking) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Checking invitation…</div>;
  if (!event) return <div className="flex min-h-screen flex-col"><header className="border-b border-border px-6 py-5 font-display text-xl font-bold uppercase">Find Your North</header><div className="m-auto w-full max-w-md px-6 py-16"><LockKeyhole className="mb-6 h-8 w-8 text-accent" /><p className="section-label text-muted-foreground">Invitation only</p><h1 className="mt-2 font-display text-6xl font-bold uppercase">PRIVEVENTS</h1><form className="mt-8 space-y-4" onSubmit={submit}><label htmlFor="invite" className="text-sm">Invite code</label><Input id="invite" aria-label="Invite code" autoComplete="off" maxLength={6} minLength={6} pattern="[A-Za-z0-9]{6}" required value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="h-14 text-center font-mono text-2xl uppercase" />{message && <p role="alert" className="text-sm text-accent">{message}</p>}<Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Checking…" : "Enter event"}</Button></form></div><footer className="px-6 py-5 text-xs text-muted-foreground">Find Your North · North Idaho</footer></div>;
  const format = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: event.timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(value));
  return <div><header className="flex items-center justify-between border-b border-border px-6 py-4"><span className="font-display text-xl font-bold uppercase">Find Your North</span><Button variant="ghost" size="sm" onClick={async () => { revision.current++; setEvent(null); await leave(); }}><LogOut className="h-4 w-4" />Leave event</Button></header><EventHero event={event} /><div className="mx-auto max-w-7xl px-6 py-10"><div className="grid gap-8 border-b border-border pb-8 md:grid-cols-2"><div className="space-y-4"><p className="flex gap-3"><CalendarDays className="h-5 w-5 shrink-0 text-accent" /><span>{format(event.starts_at)}</span></p><p className="flex gap-3 text-muted-foreground"><Clock className="h-5 w-5 shrink-0" /><span>Until {format(event.ends_at)} · {event.timezone}</span></p>{(event.location_name || event.address) && <p className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-accent" /><span>{event.location_name}<span className="block text-sm text-muted-foreground">{event.address}</span></span></p>}</div><div className="flex flex-wrap content-start gap-3"><Button onClick={calendar}><CalendarDays />Add to calendar</Button>{event.address && <><Button asChild variant="outline"><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`} target="_blank" rel="noopener noreferrer"><Navigation />Directions</a></Button><Button variant="outline" title="Copy address" aria-label="Copy address" size="icon" onClick={() => { void navigator.clipboard.writeText(event.address).then(() => toast.success("Address copied.")); }}><Copy /></Button></>}{event.contact_email && <Button asChild variant="outline"><a href={`mailto:${event.contact_email}`}><Mail />Contact host</a></Button>}</div></div>{event.description && <section className="max-w-3xl py-10"><h2 className="font-display text-3xl font-bold uppercase">About the event</h2><p className="mt-4 whitespace-pre-wrap leading-relaxed">{event.description}</p></section>}{event.details.map((section, i) => <section key={i} className="max-w-3xl border-t border-border py-8"><h2 className="font-display text-3xl font-bold uppercase">{section.heading}</h2><p className="mt-4 whitespace-pre-wrap leading-relaxed">{section.text}</p></section>)}</div></div>;
}
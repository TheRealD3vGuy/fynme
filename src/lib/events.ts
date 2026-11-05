import { z } from "zod";

export const inviteCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, "Enter exactly six letters and numbers.");
export const heroSchema = z.object({ media_type: z.enum(["image", "slideshow", "video"]).default("image"), image_url: z.string().default(""), video_url: z.string().default(""), slides: z.array(z.string()).max(20).default([]), slide_seconds: z.number().min(2).max(30).default(5), overlay: z.number().min(0).max(1).default(0.45) });
export const eventSchema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(160), subtitle: z.string().max(500), description: z.string().max(20000), starts_at: z.string().datetime(), ends_at: z.string().datetime(), timezone: z.string().refine(v => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }, "Choose a valid time zone."), location_name: z.string().max(300), address: z.string().max(1000), contact_email: z.union([z.literal(""), z.string().email()]), details: z.array(z.object({ heading: z.string().max(160), text: z.string().max(10000) })).max(30), hero: heroSchema, is_published: z.boolean(), code: z.union([z.literal(""), inviteCodeSchema]) }).refine(v => Date.parse(v.ends_at) > Date.parse(v.starts_at), "Event end must be after its start.");
export type EventDraft = z.input<typeof eventSchema>;
export type EventView = Omit<z.output<typeof eventSchema>, "code" | "id"> & { id: string; is_locked: boolean; access_version: number };
export function eventAccessible(e: { is_published: boolean; is_locked: boolean; ends_at: string; access_version: number }, version: number, now: number) {
  return e.is_published && !e.is_locked && e.access_version === version && Date.parse(e.ends_at) > now;
}
const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const stamp = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function eventCalendar(e: Pick<EventView, "id" | "title" | "starts_at" | "ends_at" | "description" | "address" | "location_name">) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Find Your North//Private Events//EN", "BEGIN:VEVENT", `UID:${e.id}@fyn-events`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(e.starts_at)}`, `DTEND:${stamp(e.ends_at)}`, `SUMMARY:${escapeIcs(e.title)}`, `DESCRIPTION:${escapeIcs(e.description)}`, `LOCATION:${escapeIcs([e.location_name, e.address].filter(Boolean).join(", "))}`, "END:VEVENT", "END:VCALENDAR"];
  return lines.map(line => { const chars = Array.from(line); let out = "", width = 0; for (const char of chars) { const n = new TextEncoder().encode(char).length; if (width + n > 73) { out += "\r\n "; width = 1; } out += char; width += n; } return out; }).join("\r\n") + "\r\n";
}
import { getCookie, setCookie, getRequestUrl, setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { EventView } from "./events";
import { heroSchema } from "./events";

export async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export function guestCookie(value: string, seconds: number) {
  const secure = getRequestUrl().protocol === "https:";
  setCookie("fyn-event-session", value, { path: "/", httpOnly: true, secure, sameSite: secure ? "none" : "lax", maxAge: seconds });
  setResponseHeader("Cache-Control", "no-store");
}
export async function readGuest() {
  setResponseHeader("Cache-Control", "no-store");
  const token = getCookie("fyn-event-session");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.rpc("read_guest_event", { session_hash: await digest(token) });
  if (error) throw new Error("Unable to check event access.");
  const row = data?.[0];
  if (!row) { guestCookie("", 0); return null; }
  const hero = heroSchema.parse(row.hero);
  const ttl = Math.max(1, Math.min(30, Math.floor((Date.parse(row.ends_at) - Date.now()) / 1000)));
  async function media(path: string) {
    if (!path) return "";
    // Only paths in the dedicated private bucket; never expose persistent signed links.
    const { data, error } = await supabaseAdmin.storage.from("event-media").createSignedUrl(path, ttl);
    if (error) return "";
    return data.signedUrl;
  }
  const details = Array.isArray(row.details) ? row.details as Array<{ heading: string; text: string }> : [];
  return { id: row.id, title: row.title, subtitle: row.subtitle, description: row.description, starts_at: row.starts_at, ends_at: row.ends_at, timezone: row.timezone, location_name: row.location_name, address: row.address, contact_email: row.contact_email, details, is_published: row.is_published, is_locked: row.is_locked, access_version: row.access_version, hero: { ...hero, image_url: await media(hero.image_url), video_url: await media(hero.video_url), slides: await Promise.all(hero.slides.map(media)) } } satisfies EventView;
}
export { supabaseAdmin };
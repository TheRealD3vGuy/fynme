import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eventSchema, inviteCodeSchema } from "./events";

export const enterEvent = createServerFn({ method: "POST" }).inputValidator(d => inviteCodeSchema.parse(d)).handler(async ({ data }) => {
  const { digest, guestCookie, supabaseAdmin } = await import("./events.server");
  const token = crypto.randomUUID() + crypto.randomUUID();
  const { data: id, error } = await supabaseAdmin.rpc("redeem_event_invite", { invite_hash: await digest(data), session_hash: await digest(token) });
  if (error) throw new Error("Unable to check invite. Please try again.");
  if (!id) { guestCookie("", 0); return { ok: false }; }
  guestCookie(token, 60 * 60 * 24 * 365);
  return { ok: true };
});
export const getGuestEvent = createServerFn({ method: "POST" }).handler(async () => {
  const { readGuest } = await import("./events.server");
  return readGuest();
});
export const leaveEvent = createServerFn({ method: "POST" }).handler(async () => {
  const { guestCookie } = await import("./events.server");
  guestCookie("", 0);
  return { ok: true };
});
export const savePrivateEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(d => eventSchema.parse(d)).handler(async ({ data, context }) => {
  const { digest } = await import("./events.server");
  // Normal staff writes use the authenticated client and editor-scoped RLS.
  const { id, code, ...fields } = data;
  if (!id && !code) throw new Error("A six-character invite code is required.");
  const values = { ...fields, ...(code ? { code_hash: await digest(code) } : {}) };
  const result = id ? await context.supabase.from("private_events").update(values).eq("id", id).select("id").single() : await context.supabase.from("private_events").insert({ ...fields, code_hash: await digest(code) }).select("id").single();
  if (result.error) throw new Error(result.error.code === "23505" ? "That invite code is already in use." : "Unable to save event. Check your permissions.");
  return result.data;
});
export const listPrivateEvents = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  // Staff-only listing; RLS scopes this to editor roles.
  const { data, error } = await context.supabase.from("private_events").select("*").order("starts_at", { ascending: false });
  if (error) throw new Error("Unable to load events.");
  return data;
});
export const lockPrivateEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(d => z.object({ id: z.string().uuid(), locked: z.boolean() }).parse(d)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("private_events").update({ is_locked: data.locked }).eq("id", data.id).select("id").single();
  if (error) throw new Error("Unable to change event access.");
  return { ok: true };
});
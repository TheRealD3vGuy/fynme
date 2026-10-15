import { supabase } from "@/integrations/supabase/client";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function logActivity(action: string, entity: string, entityId: string | null, summary: string) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("activity_log").insert({
    actor_id: data.user?.id ?? null,
    action,
    entity,
    entity_id: entityId,
    summary,
  });
}

export const dollarsToCents = (v: string) => Math.round(parseFloat(v || "0") * 100);
export const centsToDollars = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

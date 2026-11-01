import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const API = "https://api.printify.com/v1";

function creds() {
  const token = process.env["PRINTIFY_API_TOKEN"];
  const shop = process.env["PRINTIFY_SHOP_ID"];
  if (!token || !shop) throw new Error("Printify is not connected yet. Add your API token and Shop ID.");
  return { token, shop };
}

async function pf<T = any>(path: string, init?: RequestInit): Promise<T> {
  const { token } = creds();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "FYN-Store", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Printify error", res.status, body);
    throw new Error(`Printify request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden");
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

export const printifyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const configured = !!process.env["PRINTIFY_API_TOKEN"] && !!process.env["PRINTIFY_SHOP_ID"];
    if (!configured) return { configured: false, shopTitle: null as string | null, error: null as string | null };
    try {
      const shops = await pf<Array<{ id: number; title: string }>>("/shops.json");
      const shop = shops.find((s) => String(s.id) === process.env["PRINTIFY_SHOP_ID"]);
      return { configured: true, shopTitle: shop?.title ?? null, error: shop ? null : "Shop ID not found on this Printify account." };
    } catch (e) {
      return { configured: true, shopTitle: null, error: (e as Error).message };
    }
  });

export const listPrintifyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { shop } = creds();
    const res = await pf<{ data: any[] }>(`/shops/${shop}/products.json?limit=50`);
    const { data: linked } = await context.supabase.from("products").select("printify_product_id").not("printify_product_id", "is", null);
    const linkedIds = new Set((linked ?? []).map((r: any) => r.printify_product_id));
    return res.data.map((p) => ({
      id: String(p.id),
      title: String(p.title),
      image: (p.images?.[0]?.src as string) ?? null,
      variantCount: (p.variants ?? []).filter((v: any) => v.is_enabled).length,
      imported: linkedIds.has(String(p.id)),
    }));
  });

export const importPrintifyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { shop } = creds();
    const p = await pf<any>(`/shops/${shop}/products/${data.id}.json`);
    const sb = context.supabase;
    const variants = (p.variants ?? []).filter((v: any) => v.is_enabled);
    const minPrice = variants.length ? Math.min(...variants.map((v: any) => v.price)) : 0;
    const description = String(p.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const { data: existing } = await sb.from("products").select("id").eq("printify_product_id", data.id).maybeSingle();
    let productId: string;
    if (existing) {
      productId = existing.id;
      await sb.from("products").update({ name: p.title, description, price_cents: minPrice, fulfillment_source: "printify" }).eq("id", productId);
      await sb.from("product_variants").delete().eq("product_id", productId);
      await sb.from("product_images").delete().eq("product_id", productId);
    } else {
      const { data: row, error } = await sb.from("products").insert({
        name: p.title, slug: `${slugify(p.title)}-${data.id.slice(-5)}`, description, price_cents: minPrice,
        is_published: false, printify_product_id: data.id, fulfillment_source: "printify",
      }).select("id").single();
      if (error) throw new Error(error.message);
      productId = row.id;
    }
    if (variants.length) {
      const { error } = await sb.from("product_variants").insert(variants.map((v: any, i: number) => ({
        product_id: productId, name: v.title, price_cents: v.price, sku: v.sku ?? null,
        stock: 999, position: i, printify_variant_id: v.id,
      })));
      if (error) throw new Error(error.message);
    }
    const imgs = (p.images ?? []).slice(0, 6);
    if (imgs.length) {
      await sb.from("product_images").insert(imgs.map((im: any, i: number) => ({ product_id: productId, url: im.src, position: i, alt: p.title })));
    }
    return { productId, updated: !!existing };
  });

export const sendOrderToPrintify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), sendToProduction: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { shop } = creds();
    const sb = context.supabase;
    const { data: order, error } = await sb.from("orders").select("*, order_items(*)").eq("id", data.orderId).single();
    if (error || !order) throw new Error("Order not found.");
    if (order.printify_order_id) throw new Error("This order was already sent to Printify.");
    if (order.payment_status !== "paid") throw new Error("Only paid orders can be sent to Printify.");

    const variantIds = (order.order_items ?? []).map((i: any) => i.variant_id).filter(Boolean);
    const { data: vs } = await sb.from("product_variants").select("id, printify_variant_id, products(printify_product_id)").in("id", variantIds);
    const map = new Map((vs ?? []).map((v: any) => [v.id, v]));
    const line_items = (order.order_items ?? []).flatMap((i: any) => {
      const v: any = map.get(i.variant_id);
      if (!v?.printify_variant_id || !v.products?.printify_product_id) return [];
      return [{ product_id: v.products.printify_product_id, variant_id: Number(v.printify_variant_id), quantity: i.quantity }];
    });
    if (!line_items.length) throw new Error("No items in this order are Printify products.");

    const a = (order.shipping_address ?? {}) as Record<string, string>;
    const name = (a["name"] ?? "").trim().split(/\s+/);
    const created = await pf<{ id: string }>(`/shops/${shop}/orders.json`, {
      method: "POST",
      body: JSON.stringify({
        external_id: order.id, label: order.order_number, line_items, shipping_method: 1, send_shipping_notification: false,
        address_to: {
          first_name: name[0] ?? "", last_name: name.slice(1).join(" "), email: order.email, phone: a["phone"] ?? "",
          country: a["country"] ?? "US", region: a["state"] ?? a["region"] ?? "", address1: a["line1"] ?? a["address1"] ?? "",
          address2: a["line2"] ?? a["address2"] ?? "", city: a["city"] ?? "", zip: a["postal_code"] ?? a["zip"] ?? "",
        },
      }),
    });
    if (data.sendToProduction) {
      await pf(`/shops/${shop}/orders/${created.id}/send_to_production.json`, { method: "POST" });
    }
    await sb.from("orders").update({ printify_order_id: created.id, printify_status: data.sendToProduction ? "in-production" : "on-hold" }).eq("id", order.id);
    return { printifyOrderId: created.id };
  });

export const registerPrintifyWebhooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { shop } = creds();
    const secret = process.env["PRINTIFY_WEBHOOK_SECRET"];
    if (!secret) throw new Error("Webhook secret is missing.");
    const url = `${data.origin}/api/public/printify-webhook`;
    const existing = await pf<Array<{ id: string; topic: string; url: string }>>(`/shops/${shop}/webhooks.json`);
    const topics = ["order:updated", "order:sent-to-production", "order:shipment:created", "order:shipment:delivered"];
    let added = 0;
    for (const topic of topics) {
      if (existing.some((w) => w.topic === topic && w.url === url)) continue;
      await pf(`/shops/${shop}/webhooks.json`, { method: "POST", body: JSON.stringify({ topic, url, secret }) });
      added++;
    }
    return { added, url };
  });

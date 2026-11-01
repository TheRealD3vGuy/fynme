import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const Payload = z.object({
  type: z.string().max(100),
  resource: z.object({
    id: z.string().max(100),
    data: z.record(z.string(), z.any()).optional(),
  }),
});

export const Route = createFileRoute("/api/public/printify-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PRINTIFY_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const body = await request.text();
        const sig = (request.headers.get("x-pfy-signature") ?? "").replace(/^sha256=/, "");
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
          return new Response("Invalid signature", { status: 401 });
        }
        const parsed = Payload.safeParse(JSON.parse(body));
        if (!parsed.success) return new Response("Bad payload", { status: 400 });
        const { type, resource } = parsed.data;
        const d = resource.data ?? {};
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const update: { printify_status?: string; tracking_number?: string; carrier?: string; fulfillment_status?: string } = {};
        if (typeof d["status"] === "string") update.printify_status = d["status"];
        if (type === "order:sent-to-production") update.printify_status = "in-production";
        if (type === "order:shipment:created") {
          const ship = Array.isArray(d["shipments"]) ? d["shipments"][0] : d;
          if (ship?.number) update.tracking_number = String(ship.number);
          if (ship?.carrier) update.carrier = String(ship.carrier);
          update.fulfillment_status = "shipped";
          update.printify_status = "shipped";
        }
        if (type === "order:shipment:delivered") {
          update.fulfillment_status = "delivered";
          update.printify_status = "delivered";
        }
        if (Object.keys(update).length) {
          await supabaseAdmin.from("orders").update(update).eq("printify_order_id", resource.id);
        }
        return new Response("ok");
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  importPrintifyProduct, listPrintifyProducts, printifyStatus, registerPrintifyWebhooks, sendOrderToPrintify,
} from "@/lib/printify.functions";

export const Route = createFileRoute("/admin/printify")({ component: PrintifyPage });

function PrintifyPage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(printifyStatus);
  const listFn = useServerFn(listPrintifyProducts);
  const importFn = useServerFn(importPrintifyProduct);
  const sendFn = useServerFn(sendOrderToPrintify);
  const hookFn = useServerFn(registerPrintifyWebhooks);
  const [busy, setBusy] = useState<string | null>(null);

  const status = useQuery({ queryKey: ["printify-status"], queryFn: () => statusFn() });
  const ready = status.data?.configured && !status.data.error;
  const products = useQuery({ queryKey: ["printify-products"], queryFn: () => listFn(), enabled: !!ready });
  const orders = useQuery({
    queryKey: ["printify-orders"],
    queryFn: async () => (await supabase.from("orders").select("id, order_number, email, payment_status, printify_order_id, printify_status, tracking_number")
      .order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try { await fn(); toast.success(ok); } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl uppercase">Printify</h1>
        <p className="text-muted-foreground">Import print-on-demand products and send paid orders to Printify for printing and shipping.</p>
      </div>

      <section className="border border-border bg-card p-5">
        <p className="section-label text-xs text-muted-foreground">Connection</p>
        {status.isLoading ? <p>Checking…</p> : !status.data?.configured ? (
          <p className="mt-2">Not connected. Add your Printify API token and Shop ID to connect.</p>
        ) : status.data.error ? (
          <p className="mt-2 text-destructive">{status.data.error}</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <p>Connected to <strong>{status.data.shopTitle}</strong></p>
            <Button size="sm" variant="outline" disabled={busy === "hooks"}
              onClick={() => run("hooks", () => hookFn({ data: { origin: window.location.origin } }), "Tracking updates turned on")}>
              Turn on tracking updates
            </Button>
          </div>
        )}
      </section>

      {ready && (
        <section>
          <h2 className="font-display text-2xl uppercase">Your Printify products</h2>
          <p className="mb-4 text-sm text-muted-foreground">Imported items start as drafts — publish them from Products when ready.</p>
          {products.isLoading ? <p>Loading…</p> : products.error ? <p className="text-destructive">{(products.error as Error).message}</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(products.data ?? []).map((p) => (
                <div key={p.id} className="border border-border bg-card p-3">
                  {p.image && <img src={p.image} alt={p.title} className="mb-3 aspect-square w-full object-cover" loading="lazy" />}
                  <p className="font-display text-lg uppercase">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.variantCount} sizes/colors{p.imported ? " · in store" : ""}</p>
                  <Button size="sm" className="mt-3 w-full" disabled={busy === p.id}
                    onClick={() => run(p.id, async () => { await importFn({ data: { id: p.id } }); qc.invalidateQueries({ queryKey: ["printify-products"] }); }, p.imported ? "Updated from Printify" : "Imported as draft")}>
                    {p.imported ? "Re-sync" : "Import"}
                  </Button>
                </div>
              ))}
              {products.data?.length === 0 && <p className="text-muted-foreground">No products in your Printify shop yet.</p>}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl uppercase">Send orders</h2>
        <p className="mb-4 text-sm text-muted-foreground">Only paid orders can be sent. "Send for review" holds it in Printify so you can check it first.</p>
        <div className="divide-y divide-border border border-border bg-card">
          {(orders.data ?? []).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-semibold">{o.order_number} <span className="text-muted-foreground">· {o.email}</span></p>
                <p className="text-xs text-muted-foreground">Payment: {o.payment_status}{o.printify_status ? ` · Printify: ${o.printify_status}` : ""}{o.tracking_number ? ` · Tracking ${o.tracking_number}` : ""}</p>
              </div>
              {!o.printify_order_id && o.payment_status === "paid" && ready && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy === o.id}
                    onClick={() => run(o.id, async () => { await sendFn({ data: { orderId: o.id, sendToProduction: false } }); orders.refetch(); }, "Sent to Printify for review")}>Send for review</Button>
                  <Button size="sm" disabled={busy === o.id}
                    onClick={() => run(o.id, async () => { await sendFn({ data: { orderId: o.id, sendToProduction: true } }); orders.refetch(); }, "Sent to production")}>Print now</Button>
                </div>
              )}
            </div>
          ))}
          {orders.data?.length === 0 && <p className="p-3 text-muted-foreground">No orders yet.</p>}
        </div>
      </section>
    </div>
  );
}

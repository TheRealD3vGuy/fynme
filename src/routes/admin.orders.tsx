import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/orders")({ component: OrdersPage });

const FULFILL = ["unfulfilled", "packing", "shipped", "delivered", "cancelled"];
const PAY = ["pending", "paid", "refunded", "failed"];

function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });
  const list = (orders ?? []).filter(
    (o) => (filter === "all" || o.fulfillment_status === filter) && (!q || `${o.order_number} ${o.email}`.toLowerCase().includes(q.toLowerCase())),
  );
  const order = orders?.find((o) => o.id === selected) ?? null;

  return (
    <div>
      <div className="print:hidden">
        <p className="section-label text-xs text-muted-foreground">Sales</p>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Orders</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          <Input placeholder="Search order # or email" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs bg-secondary" />
          {["all", ...FULFILL].map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="divide-y divide-border border border-border print:hidden">
          {list.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              No orders yet. Online orders will appear here once payments are connected. For in-person sales, use the Receipt Printer.
            </p>
          )}
          {list.map((o) => (
            <button key={o.id} onClick={() => setSelected(o.id)} className={`flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-card ${selected === o.id ? "bg-card" : ""}`}>
              <span className="font-display">{o.order_number}</span>
              <span className="flex-1 truncate text-muted-foreground">{o.email}</span>
              <span className="capitalize text-xs">{o.fulfillment_status}</span>
              <span>{formatPrice(o.total_cents)}</span>
            </button>
          ))}
        </div>
        {order && <OrderDetail key={order.id} order={order} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-orders"] })} />}
      </div>
    </div>
  );
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof fetchOne>>>;
async function fetchOne() {
  return (await supabase.from("orders").select("*, order_items(*)").limit(1).maybeSingle()).data;
}

function OrderDetail({ order, onSaved }: { order: OrderRow; onSaved: () => void }) {
  const [pay, setPay] = useState(order.payment_status);
  const [ful, setFul] = useState(order.fulfillment_status);
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [notes, setNotes] = useState(order.internal_notes ?? "");
  useEffect(() => { setPay(order.payment_status); }, [order.payment_status]);
  const addr = (order.shipping_address ?? {}) as Record<string, string | undefined>;

  async function save() {
    const { error } = await supabase.from("orders").update({ payment_status: pay, fulfillment_status: ful, tracking_number: tracking || null, internal_notes: notes || null }).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("update", "order", order.id, `Order ${order.order_number}: ${ful}, ${pay}`);
    toast.success("Order updated.");
    onSaved();
  }

  return (
    <div>
      <div className="space-y-4 border border-border bg-card p-4 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase">{order.order_number}</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Packing Slip</Button>
            <Button size="sm" asChild><Link to="/admin/receipts" search={{ order: order.id }}><Receipt className="mr-1 h-4 w-4" />Receipt</Link></Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{order.email} · {new Date(order.created_at).toLocaleString()}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>Payment<select value={pay} onChange={(e) => setPay(e.target.value)} className="mt-1 h-10 w-full border border-border bg-secondary px-2 capitalize">{PAY.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>Fulfillment<select value={ful} onChange={(e) => setFul(e.target.value)} className="mt-1 h-10 w-full border border-border bg-secondary px-2 capitalize">{FULFILL.map((p) => <option key={p}>{p}</option>)}</select></label>
        </div>
        <Input placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} className="bg-secondary" />
        <Textarea placeholder="Staff notes (private)" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-secondary" />
        <Button onClick={save}>Save Changes</Button>
        <p className="text-xs text-muted-foreground">Only mark an order paid after confirming the payment really arrived.</p>
      </div>

      {/* Packing slip (printed) */}
      <div id="receipt-print" className="receipt-paper mt-6 p-6 text-sm">
        <div className="flex justify-between">
          <div><p className="text-xl font-bold uppercase">Find Your North</p><p>Packing Slip</p></div>
          <div className="text-right"><p className="font-bold">{order.order_number}</p><p>{new Date(order.created_at).toLocaleDateString()}</p></div>
        </div>
        <div className="mt-4">
          <p className="font-bold uppercase">Ship to</p>
          <p>{addr["name"]}</p><p>{addr["line1"]}</p>{addr["line2"] && <p>{addr["line2"]}</p>}
          <p>{[addr["city"], addr["state"], addr["postal"]].filter(Boolean).join(", ")}</p><p>{order.email}</p>
        </div>
        <table className="mt-4 w-full border-collapse">
          <thead><tr className="border-b border-current text-left"><th className="py-1">Item</th><th>Size</th><th className="text-right">Qty</th><th className="text-center">Packed</th></tr></thead>
          <tbody>
            {order.order_items.map((i) => (
              <tr key={i.id} className="border-b border-dashed border-current"><td className="py-1">{i.name}</td><td>{i.variant_name}</td><td className="text-right">{i.quantity}</td><td className="text-center">☐</td></tr>
            ))}
          </tbody>
        </table>
        {order.tracking_number && <p className="mt-3">Tracking: {order.tracking_number}</p>}
        <p className="mt-6 text-center">Thanks for supporting a small North Idaho brand. Find Your North.</p>
      </div>
    </div>
  );
}

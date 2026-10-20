import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { computeReceipt, type ReceiptLine } from "@/lib/receipt";
import { centsToDollars, dollarsToCents, logActivity } from "@/lib/admin";

export const Route = createFileRoute("/admin/receipts")({
  validateSearch: (s: Record<string, unknown>): { order?: string | undefined } => ({
    order: typeof s["order"] === "string" ? (s["order"] as string) : undefined,
  }),
  component: ReceiptsPage,
});

type Paper = "58mm" | "80mm" | "letter";
const PAYMENTS = ["cash", "card", "venmo", "paypal", "cash app", "check", "other"];
const uid = () => Math.random().toString(36).slice(2);

function ReceiptsPage() {
  const { order: orderId } = Route.useSearch();
  const qc = useQueryClient();
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [discountType, setDiscountType] = useState<"none" | "percent" | "amount">("none");
  const [discountInput, setDiscountInput] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [code, setCode] = useState("");
  const [taxRate, setTaxRate] = useState("6");
  const [shipping, setShipping] = useState("");
  const [tip, setTip] = useState("");
  const [payment, setPayment] = useState("cash");
  const [tendered, setTendered] = useState("");
  const [notes, setNotes] = useState("Thanks for supporting Find Your North!");
  const [internal, setInternal] = useState("");
  const [paper, setPaper] = useState<Paper>("80mm");
  const [linkedOrder, setLinkedOrder] = useState<string | null>(null);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [custom, setCustom] = useState({ name: "", price: "" });
  const [saving, setSaving] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["admin-receipt-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price_cents, product_variants(id, name, price_cents, stock, position)")
        .order("name");
      return data ?? [];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["setting", "store"],
    queryFn: async () => (await supabase.from("site_settings").select("value").eq("key", "store").maybeSingle()).data?.value as
      | { name?: string; contact_email?: string; tagline?: string }
      | undefined,
  });
  const { data: history } = useQuery({
    queryKey: ["admin-receipts"],
    queryFn: async () => (await supabase.from("receipts").select("*").order("created_at", { ascending: false }).limit(25)).data ?? [],
  });

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const { data: o } = await supabase.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
      if (!o) return;
      setLinkedOrder(o.id);
      const addr = (o.shipping_address ?? {}) as { name?: string; phone?: string };
      setCustomer({ name: addr.name ?? "", email: o.email, phone: addr.phone ?? "" });
      setLines(o.order_items.map((i) => ({ key: uid(), name: i.name, variant: i.variant_name, qty: i.quantity, unitCents: i.unit_price_cents })));
      if (o.discount_cents) { setDiscountType("amount"); setDiscountInput(centsToDollars(o.discount_cents)); }
      setShipping(centsToDollars(o.shipping_cents));
      setTaxRate(o.subtotal_cents ? (((o.tax_cents) / Math.max(1, o.subtotal_cents - o.discount_cents)) * 100).toFixed(2) : "0");
      setPayment("card");
      setInternal(`Order ${o.order_number}`);
    })();
  }, [orderId]);

  const options = useMemo(
    () =>
      (products ?? []).flatMap((p) =>
        [...p.product_variants].sort((a, b) => a.position - b.position).map((v) => ({
          id: v.id,
          label: `${p.name} — ${v.name} (${formatPrice(v.price_cents ?? p.price_cents)}, ${v.stock} in stock)`,
          name: p.name,
          variant: v.name,
          cents: v.price_cents ?? p.price_cents,
        })),
      ),
    [products],
  );

  const discountValue = discountType === "percent" ? parseFloat(discountInput || "0") : dollarsToCents(discountInput);
  const tenderedCents = tendered ? dollarsToCents(tendered) : null;
  const t = computeReceipt({
    lines,
    discountType,
    discountValue,
    taxRate: parseFloat(taxRate || "0"),
    shippingCents: dollarsToCents(shipping),
    tipCents: dollarsToCents(tip),
    tenderedCents,
  });

  function addPicked() {
    const o = options.find((x) => x.id === pick);
    if (!o) return;
    setLines((ls) => {
      const ex = ls.find((l) => l.name === o.name && l.variant === o.variant);
      if (ex) return ls.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { key: uid(), name: o.name, variant: o.variant, qty: 1, unitCents: o.cents }];
    });
    setPick("");
  }
  function addCustom() {
    if (!custom.name.trim()) { toast.error("Give the item a name."); return; }
    setLines((ls) => [...ls, { key: uid(), name: custom.name.trim(), qty: 1, unitCents: dollarsToCents(custom.price) }]);
    setCustom({ name: "", price: "" });
  }
  const update = (key: string, patch: Partial<ReceiptLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function applyCode() {
    const { data } = await supabase.from("discounts").select("*").ilike("code", code.trim()).maybeSingle();
    if (!data || !data.is_active) { toast.error("Code not found or inactive."); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("That code has expired."); return; }
    if (data.min_order_cents && t.subtotal < data.min_order_cents) { toast.error(`Needs a ${formatPrice(data.min_order_cents)} minimum.`); return; }
    if (data.type === "percent") { setDiscountType("percent"); setDiscountInput(String(data.value)); }
    else { setDiscountType("amount"); setDiscountInput(centsToDollars(data.value)); }
    setDiscountLabel(data.code.toUpperCase());
    toast.success(`${data.code.toUpperCase()} applied.`);
  }

  function reset() {
    setLines([]); setCustomer({ name: "", email: "", phone: "" }); setDiscountType("none"); setDiscountInput(""); setDiscountLabel("");
    setCode(""); setShipping(""); setTip(""); setTendered(""); setInternal(""); setReceiptNo(null); setSavedAt(null); setLinkedOrder(null);
  }

  async function saveAndPrint(print: boolean) {
    if (lines.length === 0) { toast.error("Add at least one item."); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        order_id: linkedOrder,
        customer_name: customer.name || null,
        customer_email: customer.email || null,
        customer_phone: customer.phone || null,
        items: lines.map(({ name, variant, qty, unitCents, note }) => ({ name, variant: variant ?? null, qty, unitCents, note: note ?? null })),
        subtotal_cents: t.subtotal,
        discount_label: discountType === "none" ? null : discountLabel || (discountType === "percent" ? `${discountValue}% off` : "Discount"),
        discount_cents: t.discount,
        tax_rate: parseFloat(taxRate || "0"),
        tax_cents: t.tax,
        shipping_cents: dollarsToCents(shipping),
        tip_cents: dollarsToCents(tip),
        total_cents: t.total,
        payment_method: payment,
        amount_tendered_cents: tenderedCents,
        change_cents: t.change,
        notes: notes || null,
        internal_notes: internal || null,
        created_by: u.user?.id ?? null,
      })
      .select("receipt_number, created_at, id")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setReceiptNo(data.receipt_number);
    setSavedAt(data.created_at);
    await logActivity("create", "receipt", data.id, `Receipt ${data.receipt_number} — ${formatPrice(t.total)}`);
    qc.invalidateQueries({ queryKey: ["admin-receipts"] });
    toast.success(`Receipt ${data.receipt_number} saved.`);
    if (print) setTimeout(() => window.print(), 100);
  }

  function loadReceipt(r: NonNullable<typeof history>[number]) {
    const items = (r.items as { name: string; variant: string | null; qty: number; unitCents: number; note: string | null }[]) ?? [];
    setLines(items.map((i) => ({ key: uid(), name: i.name, variant: i.variant, qty: i.qty, unitCents: i.unitCents, note: i.note ?? "" })));
    setCustomer({ name: r.customer_name ?? "", email: r.customer_email ?? "", phone: r.customer_phone ?? "" });
    setDiscountType(r.discount_cents ? "amount" : "none"); setDiscountInput(centsToDollars(r.discount_cents)); setDiscountLabel(r.discount_label ?? "");
    setTaxRate(String(r.tax_rate)); setShipping(centsToDollars(r.shipping_cents)); setTip(centsToDollars(r.tip_cents));
    setPayment(r.payment_method); setTendered(centsToDollars(r.amount_tendered_cents)); setNotes(r.notes ?? ""); setInternal(r.internal_notes ?? "");
    setReceiptNo(r.receipt_number); setSavedAt(r.created_at); setLinkedOrder(r.order_id);
  }

  const storeName = settings?.name ?? "Find Your North";
  const widthClass = paper === "58mm" ? "w-[58mm]" : paper === "80mm" ? "w-[80mm]" : "w-full max-w-[8.5in]";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="section-label text-xs text-muted-foreground">Point of Sale</p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Receipt Printer</h1>
        </div>
        <Button variant="outline" onClick={reset}>New Receipt</Button>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_auto]">
        <div className="space-y-6 print:hidden">
          <Section title="Items">
            <div className="flex gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-10 min-w-0 flex-1 border border-border bg-secondary px-2 text-sm">
                <option value="">Pick a product & size…</option>
                {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <Button onClick={addPicked} disabled={!pick}>Add</Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Input placeholder="Custom item (e.g. Market bundle)" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className="bg-secondary" />
              <Input placeholder="$ price" inputMode="decimal" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} className="w-28 bg-secondary" />
              <Button variant="outline" onClick={addCustom}>Add</Button>
            </div>
            <div className="mt-4 divide-y divide-border border border-border">
              {lines.length === 0 && <p className="p-4 text-sm text-muted-foreground">No items yet.</p>}
              {lines.map((l) => (
                <div key={l.key} className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display uppercase">{l.name}</p>
                      {l.variant && <p className="text-xs text-muted-foreground">{l.variant}</p>}
                    </div>
                    <div className="flex items-center border border-border">
                      <button className="px-2 py-1" aria-label="Less" onClick={() => update(l.key, { qty: Math.max(1, l.qty - 1) })}><Minus className="h-3 w-3" /></button>
                      <span className="w-7 text-center text-sm">{l.qty}</span>
                      <button className="px-2 py-1" aria-label="More" onClick={() => update(l.key, { qty: l.qty + 1 })}><Plus className="h-3 w-3" /></button>
                    </div>
                    <Input className="w-24 bg-secondary" inputMode="decimal" value={centsToDollars(l.unitCents)} onChange={(e) => update(l.key, { unitCents: dollarsToCents(e.target.value) })} aria-label="Unit price" />
                    <span className="w-20 text-right text-sm">{formatPrice(l.qty * l.unitCents)}</span>
                    <button aria-label="Remove" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <Input placeholder="Line note (printed)" value={l.note ?? ""} onChange={(e) => update(l.key, { note: e.target.value })} className="h-8 bg-secondary text-xs" />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Customer">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder="Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="bg-secondary" />
              <Input placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="bg-secondary" />
              <Input placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="bg-secondary" />
            </div>
          </Section>

          <Section title="Calculate">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Discount">
                <div className="flex gap-2">
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as typeof discountType)} className="h-10 border border-border bg-secondary px-2 text-sm">
                    <option value="none">None</option><option value="percent">% off</option><option value="amount">$ off</option>
                  </select>
                  <Input disabled={discountType === "none"} inputMode="decimal" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="bg-secondary" />
                </div>
              </Field>
              <Field label="Promo code">
                <div className="flex gap-2">
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="NORTH10" className="bg-secondary" />
                  <Button variant="outline" onClick={applyCode} disabled={!code.trim()}>Apply</Button>
                </div>
              </Field>
              <Field label="Tax rate %"><Input inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="bg-secondary" /></Field>
              <Field label="Shipping $"><Input inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} className="bg-secondary" /></Field>
              <Field label="Tip $">
                <div className="flex gap-1">
                  <Input inputMode="decimal" value={tip} onChange={(e) => setTip(e.target.value)} className="bg-secondary" />
                  {[10, 15, 20].map((p) => (
                    <Button key={p} variant="outline" size="sm" className="h-10" onClick={() => setTip(((t.taxable * p) / 10000).toFixed(2))}>{p}%</Button>
                  ))}
                </div>
              </Field>
              <Field label="Payment">
                <select value={payment} onChange={(e) => setPayment(e.target.value)} className="h-10 w-full border border-border bg-secondary px-2 text-sm capitalize">
                  {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Amount received $">
                <div className="flex gap-1">
                  <Input inputMode="decimal" value={tendered} onChange={(e) => setTendered(e.target.value)} className="bg-secondary" />
                  <Button variant="outline" size="sm" className="h-10" onClick={() => setTendered(centsToDollars(t.total))}>Exact</Button>
                  <Button variant="outline" size="sm" className="h-10" onClick={() => setTendered((Math.ceil(t.total / 2000) * 20).toFixed(2))}>Next $20</Button>
                </div>
              </Field>
              <div className="flex flex-col justify-end text-sm">
                {t.change != null && <p>Change due: <span className="font-display text-2xl text-accent">{formatPrice(t.change)}</span></p>}
                {t.due != null && <p className="text-destructive">Still owed: {formatPrice(t.due)}</p>}
              </div>
            </div>
          </Section>

          <Section title="Notes">
            <Field label="Printed on receipt"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-secondary" /></Field>
            <Field label="Staff-only note (not printed)"><Textarea value={internal} onChange={(e) => setInternal(e.target.value)} className="mt-1 bg-secondary" /></Field>
          </Section>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase text-muted-foreground">Paper</span>
            {(["58mm", "80mm", "letter"] as Paper[]).map((p) => (
              <Button key={p} size="sm" variant={paper === p ? "default" : "outline"} onClick={() => setPaper(p)}>{p}</Button>
            ))}
            <div className="flex-1" />
            {receiptNo ? (
              <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Reprint</Button>
            ) : (
              <>
                <Button variant="outline" disabled={saving} onClick={() => saveAndPrint(false)}>Save</Button>
                <Button disabled={saving} onClick={() => saveAndPrint(true)}><Printer className="mr-2 h-4 w-4" />Save & Print</Button>
              </>
            )}
          </div>
        </div>

        {/* Preview / printable */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="section-label mb-2 text-xs text-muted-foreground print:hidden">Preview</p>
          <div id="receipt-print" className={`receipt-paper mx-auto ${widthClass} p-4 font-mono text-[11px] leading-snug`}>
            <div className="text-center">
              <p className="text-base font-bold uppercase">{storeName}</p>
              {settings?.tagline && <p>{settings.tagline}</p>}
              <p>North Idaho</p>
              {settings?.contact_email && <p>{settings.contact_email}</p>}
            </div>
            <Dash />
            <Row l="Receipt" r={receiptNo ?? "(not saved)"} />
            <Row l="Date" r={new Date(savedAt ?? Date.now()).toLocaleString()} />
            {customer.name && <Row l="Customer" r={customer.name} />}
            {customer.email && <Row l="Email" r={customer.email} />}
            {customer.phone && <Row l="Phone" r={customer.phone} />}
            <Dash />
            {lines.map((l) => (
              <div key={l.key} className="mb-1">
                <p className="font-bold uppercase">{l.name}{l.variant ? ` (${l.variant})` : ""}</p>
                <Row l={`  ${l.qty} x ${formatPrice(l.unitCents)}`} r={formatPrice(l.qty * l.unitCents)} />
                {l.note && <p className="italic">  * {l.note}</p>}
              </div>
            ))}
            <Dash />
            <Row l={`Subtotal (${t.itemCount} items)`} r={formatPrice(t.subtotal)} />
            {t.discount > 0 && <Row l={discountLabel || (discountType === "percent" ? `Discount ${discountValue}%` : "Discount")} r={`-${formatPrice(t.discount)}`} />}
            <Row l={`Tax (${parseFloat(taxRate || "0")}%)`} r={formatPrice(t.tax)} />
            {dollarsToCents(shipping) > 0 && <Row l="Shipping" r={formatPrice(dollarsToCents(shipping))} />}
            {dollarsToCents(tip) > 0 && <Row l="Tip" r={formatPrice(dollarsToCents(tip))} />}
            <div className="mt-1 text-sm font-bold"><Row l="TOTAL" r={formatPrice(t.total)} /></div>
            <Dash />
            <Row l="Paid by" r={payment.toUpperCase()} />
            {tenderedCents != null && <Row l="Received" r={formatPrice(tenderedCents)} />}
            {t.change != null && <Row l="Change" r={formatPrice(t.change)} />}
            {t.due != null && <Row l="BALANCE DUE" r={formatPrice(t.due)} />}
            {notes && (<><Dash /><p className="whitespace-pre-wrap text-center">{notes}</p></>)}
            <Dash />
            <p className="text-center">Find Your North · fynme.lovable.app</p>
          </div>
        </div>
      </div>

      <section className="mt-12 print:hidden">
        <h2 className="section-label border-b border-border pb-2 text-lg">Recent Receipts</h2>
        <div className="divide-y divide-border">
          {(history ?? []).map((r) => (
            <button key={r.id} onClick={() => loadReceipt(r)} className="flex w-full items-center gap-4 py-3 text-left text-sm hover:bg-card">
              <span className="w-20 font-display">{r.receipt_number}</span>
              <span className="flex-1 truncate text-muted-foreground">{r.customer_name ?? "Walk-in"} · {r.payment_method}{r.internal_notes ? ` · ${r.internal_notes}` : ""}</span>
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              <span className="w-20 text-right">{formatPrice(r.total_cents)}</span>
            </button>
          ))}
          {history?.length === 0 && <p className="py-3 text-sm text-muted-foreground">No receipts yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-card p-4">
      <h2 className="section-label mb-3 text-sm text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted-foreground">
      <span className="mb-1 block uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
const Row = ({ l, r }: { l: string; r: string }) => (
  <div className="flex justify-between gap-2"><span className="whitespace-pre">{l}</span><span className="text-right">{r}</span></div>
);
const Dash = () => <div className="my-2 border-t border-dashed border-current" />;

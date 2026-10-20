export type ReceiptLine = {
  key: string;
  name: string;
  variant?: string | null;
  qty: number;
  unitCents: number;
  note?: string;
};

export type ReceiptInput = {
  lines: ReceiptLine[];
  discountType: "none" | "percent" | "amount";
  discountValue: number; // percent (e.g. 10) or cents
  taxRate: number; // percent, e.g. 6
  shippingCents: number;
  tipCents: number;
  tenderedCents?: number | null;
};

export function computeReceipt(i: ReceiptInput) {
  const subtotal = i.lines.reduce((s, l) => s + Math.max(0, l.qty) * Math.max(0, l.unitCents), 0);
  let discount = 0;
  if (i.discountType === "percent") discount = Math.round((subtotal * Math.min(100, Math.max(0, i.discountValue))) / 100);
  if (i.discountType === "amount") discount = Math.max(0, i.discountValue);
  discount = Math.min(discount, subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * Math.max(0, i.taxRate)) / 100);
  const total = taxable + tax + Math.max(0, i.shippingCents) + Math.max(0, i.tipCents);
  const itemCount = i.lines.reduce((s, l) => s + Math.max(0, l.qty), 0);
  const change = i.tenderedCents != null && i.tenderedCents >= total ? i.tenderedCents - total : null;
  const due = i.tenderedCents != null && i.tenderedCents < total ? total - i.tenderedCents : null;
  return { subtotal, discount, taxable, tax, total, itemCount, change, due };
}

export const FREE_SHIPPING_CENTS = 7500;
export function freeShippingProgress(subtotalCents: number) {
  const remaining = Math.max(0, FREE_SHIPPING_CENTS - subtotalCents);
  return { remaining, percent: Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_CENTS) * 100)), unlocked: remaining === 0 };
}

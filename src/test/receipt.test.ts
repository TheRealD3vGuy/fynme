import { describe, expect, it } from "vitest";
import { computeReceipt, freeShippingProgress } from "@/lib/receipt";

const lines = [
  { key: "a", name: "Hoodie", qty: 2, unitCents: 5800 },
  { key: "b", name: "Sticker", qty: 3, unitCents: 300 },
];
const base = { lines, discountType: "none" as const, discountValue: 0, taxRate: 0, shippingCents: 0, tipCents: 0 };

describe("receipt math", () => {
  it("sums quantity x price", () => expect(computeReceipt(base).subtotal).toBe(12500));
  it("percent discount then tax on discounted amount", () => {
    const r = computeReceipt({ ...base, discountType: "percent", discountValue: 10, taxRate: 6 });
    expect(r.discount).toBe(1250);
    expect(r.tax).toBe(675);
    expect(r.total).toBe(11925);
  });
  it("dollar discount never exceeds subtotal", () => {
    expect(computeReceipt({ ...base, discountType: "amount", discountValue: 999999 }).total).toBe(0);
  });
  it("adds shipping and tip, computes change", () => {
    const r = computeReceipt({ ...base, shippingCents: 500, tipCents: 200, tenderedCents: 15000 });
    expect(r.total).toBe(13200);
    expect(r.change).toBe(1800);
  });
  it("reports amount still due when underpaid", () => {
    expect(computeReceipt({ ...base, tenderedCents: 10000 }).due).toBe(2500);
  });
  it("free shipping unlocks at $75", () => {
    expect(freeShippingProgress(6100).remaining).toBe(1400);
    expect(freeShippingProgress(7500).unlocked).toBe(true);
  });
});

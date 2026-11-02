import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SITE_GUIDE } from "@/lib/site-guide";

export const Route = createFileRoute("/admin/export")({
  component: ExportAdmin,
});

const TABLES = [
  "products", "product_variants", "product_images", "collections", "categories",
  "orders", "order_items", "receipts", "discounts",
  "pages", "page_sections", "site_settings", "navigation_items",
  "contact_submissions", "contact_notes", "newsletter_subscribers",
  "inventory_adjustments", "media_assets", "activity_log",
] as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function ExportAdmin() {
  const [zip, setZip] = useState<{ blob: Blob; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function build() {
    setBusy(true);
    const z = new JSZip();
    z.file("HOW-THE-SITE-WORKS.txt", SITE_GUIDE);
    const data = z.folder("data")!;
    const skipped: string[] = [];
    for (const t of TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase.from(t as any) as any).select("*");
      if (error) { skipped.push(`${t}: ${error.message}`); continue; }
      data.file(`${t}.json`, JSON.stringify(rows, null, 2));
    }
    if (skipped.length) z.file("skipped.txt", skipped.join("\n"));
    const blob = await z.generateAsync({ type: "blob" });
    const name = `find-your-north-export-${new Date().toISOString().slice(0, 10)}.zip`;
    setZip({ blob, name });
    setBusy(false);
    toast.success("Export ready — click Download.");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Export & Guide</h1>

      <h2 className="mt-8 section-label text-sm text-muted-foreground">Export the site</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Bundles every product, order, page, setting and message into a ZIP, plus the guide below.
        For the full source code, connect GitHub in Project settings and download it there.
      </p>
      <div className="mt-4 flex gap-3">
        <Button onClick={build} disabled={busy}>{busy ? "Preparing..." : "Prepare Export"}</Button>
        {zip && <Button variant="outline" onClick={() => downloadBlob(zip.blob, zip.name)}>Download ZIP</Button>}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="section-label text-sm text-muted-foreground">How the site works</h2>
        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(SITE_GUIDE).then(() => toast.success("Copied."))}>
          Copy
        </Button>
      </div>
      <pre className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        {SITE_GUIDE}
      </pre>
    </div>
  );
}

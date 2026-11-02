import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Drag-and-drop (or click) image uploader. Returns a long-lived link to the uploaded photo. */
export function ImageDrop({ value, onChange, label = "Photo" }: { value: string; onChange: (url: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-images").upload(path, file, { contentType: file.type });
    if (error) { setBusy(false); return toast.error(error.message); }
    const { data, error: e2 } = await supabase.storage.from("site-images").createSignedUrl(path, TEN_YEARS);
    setBusy(false);
    if (e2 || !data) return toast.error(e2?.message ?? "Upload failed.");
    onChange(data.signedUrl);
    toast.success("Photo uploaded.");
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
        className={`flex cursor-pointer items-center gap-4 border border-dashed p-4 transition-colors ${over ? "border-primary bg-card" : "border-border bg-secondary hover:border-muted-foreground"}`}
      >
        {value ? <img src={value} alt="" className="h-20 w-20 shrink-0 object-cover" /> : <div className="h-20 w-20 shrink-0 bg-card" />}
        <div className="text-sm text-muted-foreground">
          {busy ? "Uploading..." : <>Drag & drop a photo here, or <span className="text-foreground underline">browse</span></>}
          {value && !busy && (
            <button type="button" className="mt-2 block text-xs text-accent hover:underline" onClick={(e) => { e.stopPropagation(); onChange(""); }}>
              Remove photo
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </div>
    </div>
  );
}

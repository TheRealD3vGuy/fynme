import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MEDIA_UPLOAD_LIMIT_LABEL, mediaUploadError } from "@/lib/upload";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Drag-and-drop (or click) uploader for photos or videos. Returns a long-lived link to the uploaded file. */
export function ImageDrop({
  value,
  onChange,
  label = "Photo",
  kind = "image",
  bucket = "site-images",
  privatePath = false,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  kind?: "image" | "video";
  bucket?: string;
  privatePath?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const noun = kind === "video" ? "video" : "photo";

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    const validationError = mediaUploadError(file, kind);
    if (validationError) { toast.error(validationError); return; }
    setBusy(true);
    try {
    const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) { setBusy(false); toast.error(error.message); return; }
    if (privatePath) { onChange(path); toast.success("Private media uploaded."); return; }
    const { data, error: e2 } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
    setBusy(false);
    if (e2 || !data) { toast.error(e2?.message ?? "Upload failed."); return; }
    onChange(data.signedUrl);
    toast.success(kind === "video" ? "Video uploaded." : "Photo uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
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
        {value && !privatePath ? (
          kind === "video" ? (
            <video src={value} muted className="h-20 w-32 shrink-0 object-cover" />
          ) : (
            <img src={value} alt="" className="h-20 w-20 shrink-0 object-cover" />
          )
        ) : (
          <div className={`${kind === "video" ? "w-32" : "w-20"} h-20 shrink-0 bg-card`} />
        )}
        <div className="text-sm text-muted-foreground">
          {value && privatePath && <p className="mb-1 break-all text-foreground">{value}</p>}
          {busy ? "Uploading..." : <>Drag & drop a {noun} here, or <span className="text-foreground underline">browse</span></>}
          {value && !busy && (
            <Button type="button" variant="link" size="sm" className="mt-2 block h-auto p-0 text-xs text-accent" onClick={(e) => { e.stopPropagation(); onChange(""); }}>
              Remove {noun}
            </Button>
          )}
        </div>
        <input ref={input} type="file" accept={`${kind}/*`} hidden onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {kind === "video" ? "Video files" : "Image files"} · Maximum {MEDIA_UPLOAD_LIMIT_LABEL} per file
      </p>
    </div>
  );
}

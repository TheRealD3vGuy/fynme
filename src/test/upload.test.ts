import { describe, expect, it } from "vitest";
import { MEDIA_UPLOAD_LIMIT_BYTES, mediaUploadError } from "@/lib/upload";

describe("staff media size limits", () => {
  it.each(["image", "video"] as const)("allows %s files through exactly 1 GB and rejects larger files", (kind) => {
    expect(MEDIA_UPLOAD_LIMIT_BYTES).toBe(1073741824);
    const type = kind === "image" ? "image/png" : "video/mp4";
    expect(mediaUploadError({ type, size: 1073741824 }, kind)).toBeNull();
    expect(mediaUploadError({ type, size: 1073741825 }, kind)).not.toBeNull();
  });
});
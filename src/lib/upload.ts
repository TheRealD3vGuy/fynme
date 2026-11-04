/** Must match the site-images bucket and project-wide Storage limits. */
export const MEDIA_UPLOAD_LIMIT_BYTES = 1024 * 1024 * 1024;
export const MEDIA_UPLOAD_LIMIT_LABEL = "1 GB";

export function mediaUploadError(file: Pick<File, "type" | "size">, kind: "image" | "video"): string | null {
  const noun = kind === "video" ? "video" : "photo";
  if (!file.type.startsWith(`${kind}/`)) return `Please choose a ${noun} file.`;
  if (file.size > MEDIA_UPLOAD_LIMIT_BYTES) return `This ${noun} is too large. Maximum allowed size is ${MEDIA_UPLOAD_LIMIT_LABEL} per file.`;
  return null;
}
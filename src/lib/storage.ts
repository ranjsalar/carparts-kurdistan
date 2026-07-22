import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export type SaveResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Detects the image type from the file's leading bytes (magic numbers).
 * The browser-supplied MIME type and filename are never trusted — a renamed
 * .exe or a spoofed Content-Type is rejected here regardless of what it
 * claims to be.
 */
function sniffImageExt(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ".jpg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return ".png";
  }

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));

  // WEBP: "RIFF"...."WEBP"
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return ".webp";

  // HEIC/HEIF: ISO BMFF "ftyp" box with a HEIF brand
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "heif", "mif1", "msf1"].includes(brand)) return ".heic";
  }

  return null;
}

// Storage abstraction: callers only depend on the returned public URL.
// Current implementation writes to local disk under public/uploads.
// TODO: for production, replace the write below with a PutObject call to
// S3-compatible storage (R2/S3/MinIO) and return the object's public URL —
// no caller changes needed.
//
// Path-traversal note: the stored filename is always a server-generated
// UUID plus an extension derived from the sniffed content type. The
// client-supplied filename is never used, so "../../evil" style names
// cannot influence where the file lands.
export async function saveUpload(file: File): Promise<SaveResult> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "uploadSize" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImageExt(bytes);
  if (!ext) return { ok: false, error: "uploadType" };

  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return { ok: true, url: `/uploads/${filename}` };
}

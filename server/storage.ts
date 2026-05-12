/**
 * Storage helpers for Taiwan Maami
 *
 * Uses Cloudinary for all file storage (images, PDFs, JSON backups).
 * Maintains the same storagePut / storageGet API signature so all
 * existing call sites (backup.ts, workshopInvoice.ts, routers.ts,
 * hybridStorage.ts) continue to work without changes.
 */

import { ENV } from "./_core/env";
import crypto from "crypto";

// ── Cloudinary config ────────────────────────────────────────────
const CLOUD_NAME = ENV.cloudinaryCloudName;
const API_KEY = ENV.cloudinaryApiKey;
const API_SECRET = ENV.cloudinaryApiSecret;

function ensureCloudinaryConfig() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error(
      "Cloudinary credentials missing: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"
    );
  }
}

function generateSignature(params: Record<string, string | number>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(sortedParams + API_SECRET)
    .digest("hex");
}

// Map common MIME types to Cloudinary resource_type
function resourceTypeFor(contentType: string): "image" | "raw" | "video" {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/") || contentType.startsWith("audio/"))
    return "video";
  return "raw"; // PDFs, JSON, etc.
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Upload bytes to Cloudinary.
 *
 * @param relKey  Logical path, e.g. "backups/daily-2026-05-12.json"
 * @param data    File bytes
 * @param contentType  MIME type (used to pick resource_type)
 * @returns { key, url } — url is the public Cloudinary URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  ensureCloudinaryConfig();

  const key = relKey.replace(/^\/+/, "");
  const resourceType = resourceTypeFor(contentType);

  // Derive folder + public_id from the relKey
  const parts = key.split("/");
  const fileName = parts.pop() ?? key;
  const folder = parts.length > 0 ? `taiwan-maami/${parts.join("/")}` : "taiwan-maami";
  const publicId = fileName.replace(/\.[^.]+$/, ""); // strip extension

  const timestamp = Math.floor(Date.now() / 1000);

  const signatureParams: Record<string, string | number> = {
    folder,
    public_id: publicId,
    timestamp,
    overwrite: 1,
  };
  const signature = generateSignature(signatureParams);

  // Build base64 data URI for the upload
  const buf =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
  const base64 = `data:${contentType};base64,${buf.toString("base64")}`;

  const formData = new FormData();
  formData.append("file", base64);
  formData.append("api_key", API_KEY);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("overwrite", "true");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Cloudinary upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }

  const result = await response.json();
  return { key, url: result.secure_url };
}

/**
 * Get a public URL for a previously-uploaded file.
 *
 * Cloudinary URLs are already public, so this simply constructs the
 * delivery URL from the relKey. No signing or expiry needed.
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  ensureCloudinaryConfig();

  const key = relKey.replace(/^\/+/, "");
  const parts = key.split("/");
  const fileName = parts.pop() ?? key;
  const folder = parts.length > 0 ? `taiwan-maami/${parts.join("/")}` : "taiwan-maami";
  const publicId = fileName.replace(/\.[^.]+$/, "");
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "";

  // For raw resources (JSON, PDF) the URL pattern differs
  const isRaw = ["json", "pdf", "csv", "txt", "zip"].includes(ext ?? "");
  const resourceType = isRaw ? "raw" : "image";

  const url = `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/taiwan-maami/${parts.length > 0 ? parts.join("/") + "/" : ""}${publicId}${ext ? "." + ext : ""}`;

  return { key, url };
}

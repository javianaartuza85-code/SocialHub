"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

/** Límite por archivo. El plan gratuito de Supabase permite 50 MB; súbelo si tu plan lo permite. */
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 50);

export const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/quicktime,video/webm";

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(s: number | null | undefined) {
  if (!s && s !== 0) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type Meta = { width: number | null; height: number | null; duration: number | null };

/** Lee ancho, alto y duración en el navegador antes de subir. */
export function readMediaMeta(file: File): Promise<Meta> {
  const url = URL.createObjectURL(file);
  const done = (m: Meta) => {
    URL.revokeObjectURL(url);
    return m;
  };
  return new Promise((resolve) => {
    const fallback = () => resolve(done({ width: null, height: null, duration: null }));
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => resolve(done({ width: img.naturalWidth || null, height: img.naturalHeight || null, duration: null }));
      img.onerror = fallback;
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () =>
        resolve(done({ width: v.videoWidth || null, height: v.videoHeight || null, duration: Number.isFinite(v.duration) ? v.duration : null }));
      v.onerror = fallback;
      v.src = url;
    } else fallback();
  });
}

export function validateFile(file: File): string | null {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return `${file.name}: solo se permiten imágenes o videos.`;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `${file.name}: pesa más de ${MAX_UPLOAD_MB} MB.`;
  return null;
}

/** Sube un archivo al almacenamiento y lo registra en la biblioteca del cliente. */
export async function uploadAsset(
  supabase: SupabaseClient<Database>,
  opts: { clientId: string; file: File; folderId?: string | null; tags?: string[]; userId?: string },
) {
  const { clientId, file } = opts;
  const meta = await readMediaMeta(file);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(`${file.name}: ${upErr.message}`);
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      client_id: clientId,
      folder_id: opts.folderId ?? null,
      storage_path: path,
      kind: file.type.startsWith("video/") ? "video" : "image",
      mime: file.type,
      size_bytes: file.size,
      width: meta.width,
      height: meta.height,
      duration_s: meta.duration,
      filename: file.name,
      tags: opts.tags ?? [],
      uploaded_by: opts.userId ?? null,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("media").remove([path]);
    throw new Error(`${file.name}: ${error.message}`);
  }
  return data.id;
}

export function normalizeTag(t: string) {
  return t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 40);
}

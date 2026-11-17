import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

/** Genera URLs temporales (por defecto 2 horas) para archivos privados del bucket "media". */
export async function signMediaUrls(supabase: SupabaseClient<Database>, paths: string[], expiresIn = 7200) {
  const map = new Map<string, string>();
  const unique = [...new Set(paths)].filter(Boolean);
  if (!unique.length) return map;
  const { data } = await supabase.storage.from("media").createSignedUrls(unique, expiresIn);
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

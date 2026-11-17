import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tokens";

/** Valida el token del enlace y devuelve el cliente. null si no existe, venció o fue revocado. */
export async function resolveApprovalToken(token: string) {
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("approval_links")
    .select("id, client_id, expires_at, revoked_at, clients(id, name, logo_url, color_primary, color_accent, contact_name, archived_at)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!link || link.revoked_at || !link.clients || link.clients.archived_at) return null;
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return null;
  return { admin, linkId: link.id, client: link.clients };
}

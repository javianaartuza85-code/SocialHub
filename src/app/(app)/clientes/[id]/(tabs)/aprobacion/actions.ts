"use server";

import { revalidatePath } from "next/cache";
import { assertCanEdit } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hashToken, newToken } from "@/lib/tokens";

export async function createApprovalLink(clientId: string, label: string, days: number | null): Promise<{ error?: string; url?: string }> {
  const me = await assertCanEdit();
  const token = newToken();
  const supabase = await createClient();
  const { error } = await supabase.from("approval_links").insert({
    client_id: clientId,
    token_hash: hashToken(token),
    token_hint: token.slice(-4),
    label: label.trim().slice(0, 80) || "Enlace de aprobación",
    expires_at: days ? new Date(Date.now() + days * 864e5).toISOString() : null,
    created_by: me.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}/aprobacion`);
  return { url: `${process.env.NEXT_PUBLIC_SITE_URL}/aprobar/${token}` };
}

export async function revokeApprovalLink(clientId: string, id: string): Promise<{ error?: string }> {
  await assertCanEdit();
  const supabase = await createClient();
  const { error } = await supabase.from("approval_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}/aprobacion`);
  return {};
}

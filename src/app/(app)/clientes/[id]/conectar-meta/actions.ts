"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { listPages } from "@/lib/meta";
import { createAdminClient } from "@/lib/supabase/server";

export async function readPendingMeta(clientId: string) {
  const raw = (await cookies()).get("meta_pending")?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(decrypt(raw)) as { token: string; c: string };
    return v.c === clientId ? v.token : null;
  } catch {
    return null;
  }
}

/** Vincula la página de Facebook (y su Instagram profesional) elegida al cliente. */
export async function connectMetaPage(clientId: string, pageId: string): Promise<{ error?: string }> {
  await assertAdmin();
  const token = await readPendingMeta(clientId);
  if (!token) return { error: "La conexión venció. Vuelve a intentarlo desde la ficha del cliente." };
  const page = (await listPages(token)).find((p) => p.id === pageId);
  if (!page) return { error: "No encontramos esa página en tu cuenta de Facebook." };

  const db = createAdminClient();
  const now = new Date().toISOString();
  const accounts = [
    { network: "facebook" as const, external_id: page.id, external_name: page.name, handle: page.name },
    ...(page.instagram_business_account
      ? [
          {
            network: "instagram" as const,
            external_id: page.instagram_business_account.id,
            external_name: page.instagram_business_account.username ?? page.name,
            handle: page.instagram_business_account.username ? `@${page.instagram_business_account.username}` : page.name,
          },
        ]
      : []),
  ];
  for (const a of accounts) {
    const { data: acc, error } = await db
      .from("client_social_accounts")
      .upsert({ client_id: clientId, ...a, connection: "auto", connected_at: now }, { onConflict: "client_id,network" })
      .select("id")
      .single();
    if (error || !acc) return { error: error?.message ?? "No se pudo guardar la cuenta." };
    await db.from("social_tokens").upsert({ account_id: acc.id, access_token_encrypted: encrypt(page.access_token), updated_at: now });
  }
  // Las publicaciones pendientes de este cliente en esas redes pasan a automáticas
  const { data: posts } = await db.from("posts").select("id").eq("client_id", clientId).in("status", ["approved", "scheduled", "in_review", "draft", "idea"]);
  if (posts?.length)
    await db
      .from("post_targets")
      .update({ publish_mode: "auto" })
      .in("post_id", posts.map((p) => p.id))
      .in("network", accounts.map((a) => a.network))
      .eq("status", "pending");

  (await cookies()).delete("meta_pending");
  revalidatePath(`/clientes/${clientId}`, "layout");
  return {};
}

export async function disconnectMeta(clientId: string): Promise<{ error?: string }> {
  await assertAdmin();
  const db = createAdminClient();
  const { data: accs } = await db.from("client_social_accounts").select("id, network").eq("client_id", clientId).eq("connection", "auto");
  if (!accs?.length) return {};
  await db.from("social_tokens").delete().in("account_id", accs.map((a) => a.id));
  await db.from("client_social_accounts").update({ connection: "manual", external_id: null, connected_at: null }).in("id", accs.map((a) => a.id));
  const { data: posts } = await db.from("posts").select("id").eq("client_id", clientId);
  if (posts?.length)
    await db
      .from("post_targets")
      .update({ publish_mode: "manual" })
      .in("post_id", posts.map((p) => p.id))
      .in("network", accs.map((a) => a.network))
      .eq("status", "pending");
  revalidatePath(`/clientes/${clientId}`, "layout");
  return {};
}

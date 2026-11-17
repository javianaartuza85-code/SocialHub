"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin, assertCanEdit } from "@/lib/auth";
import { NETWORKS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido");
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((v) => (v ? v : null));

const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  industry: optionalText,
  logo_url: z.string().url().nullable().optional(),
  color_primary: hex,
  color_secondary: hex,
  color_accent: hex,
  contact_name: optionalText,
  contact_email: z
    .union([z.string().trim().email("Correo inválido"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  contact_phone: optionalText,
  website: optionalText,
  notes: optionalText,
  accounts: z
    .array(
      z.object({
        network: z.enum(NETWORKS as [string, ...string[]]),
        handle: z.string().trim().min(1).max(120),
        profile_url: optionalText,
      }),
    )
    .max(NETWORKS.length),
});

export type ClientInput = z.input<typeof ClientSchema>;
export type ActionResult = { error?: string; id?: string };

export async function saveClient(input: ClientInput, isNew: boolean): Promise<ActionResult> {
  await assertCanEdit();
  const parsed = ClientSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const { accounts, ...client } = parsed.data;
  const supabase = await createClient();

  const { error } = isNew
    ? await supabase.from("clients").insert(client)
    : await supabase.from("clients").update(client).eq("id", client.id);
  if (error) return { error: "No se pudo guardar el cliente: " + error.message };

  // Redes: actualiza/crea las indicadas y elimina las que se quitaron (solo las manuales).
  const { data: existing } = await supabase.from("client_social_accounts").select("id, network, connection").eq("client_id", client.id);
  const keep = new Set(accounts.map((a) => a.network));
  const toDelete = (existing ?? []).filter((e) => !keep.has(e.network) && e.connection === "manual").map((e) => e.id);
  if (toDelete.length) await supabase.from("client_social_accounts").delete().in("id", toDelete);
  if (accounts.length) {
    const { error: accErr } = await supabase.from("client_social_accounts").upsert(
      accounts.map((a) => ({ client_id: client.id, network: a.network as (typeof NETWORKS)[number], handle: a.handle, profile_url: a.profile_url })),
      { onConflict: "client_id,network" },
    );
    if (accErr) return { error: "Se guardó el cliente, pero no sus redes: " + accErr.message };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${client.id}`);
  revalidatePath("/");
  return { id: client.id };
}

export async function setClientArchived(id: string, archived: boolean): Promise<ActionResult> {
  await assertCanEdit();
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/");
  return { id };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await assertAdmin();
  const supabase = await createClient();
  // Borra también los archivos del almacenamiento
  const { data: assets } = await supabase.from("media_assets").select("storage_path").eq("client_id", id);
  if (assets?.length) await supabase.storage.from("media").remove(assets.map((a) => a.storage_path));
  const { data: logos } = await supabase.storage.from("logos").list(id);
  if (logos?.length) await supabase.storage.from("logos").remove(logos.map((l) => `${id}/${l.name}`));
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  revalidatePath("/");
  return {};
}

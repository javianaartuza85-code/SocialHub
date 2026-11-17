"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCanEdit } from "@/lib/auth";
import { NETWORKS, type Network } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

function parseHashtags(raw: string) {
  const tags = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .filter((t) => /^#[\p{L}\p{N}_]+$/u.test(t));
  return [...new Set(tags)].slice(0, 60);
}

export async function saveHashtagGroup(clientId: string, input: { id?: string; name: string; hashtags: string }): Promise<Result> {
  await assertCanEdit();
  const name = input.name.trim();
  if (!name) return { error: "Ponle un nombre al grupo." };
  const hashtags = parseHashtags(input.hashtags);
  if (!hashtags.length) return { error: "Agrega al menos un hashtag válido." };
  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from("hashtag_groups").update({ name, hashtags }).eq("id", input.id)
    : await supabase.from("hashtag_groups").insert({ client_id: clientId, name, hashtags });
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}/contenido`);
  return {};
}

export async function deleteHashtagGroup(clientId: string, id: string): Promise<Result> {
  await assertCanEdit();
  const supabase = await createClient();
  const { error } = await supabase.from("hashtag_groups").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}/contenido`);
  return {};
}

const TemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Ponle un nombre a la plantilla").max(80),
  format: z.enum(["post", "carousel", "video", "reel"]),
  caption: z.string().max(70000),
  first_comment: z.string().max(5000),
  networks: z.array(z.enum(NETWORKS as [Network, ...Network[]])),
});

export async function saveTemplateFull(clientId: string, input: z.input<typeof TemplateSchema>): Promise<Result> {
  await assertCanEdit();
  const t = TemplateSchema.safeParse(input);
  if (!t.success) return { error: t.error.issues[0]?.message };
  const { id, ...row } = t.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("templates").update(row).eq("id", id)
    : await supabase.from("templates").insert({ ...row, client_id: clientId });
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}/contenido`);
  return {};
}

export async function deleteTemplate(clientId: string, id: string): Promise<Result> {
  await assertCanEdit();
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}/contenido`);
  return {};
}

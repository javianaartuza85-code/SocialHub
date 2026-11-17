"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCanEdit, requireMember } from "@/lib/auth";
import { NETWORKS, STATUS_INFO, type Network, type PostStatus } from "@/lib/constants";
import { canMoveTo } from "@/lib/post-rules";
import { signMediaUrls } from "@/lib/signed-urls";
import { createClient } from "@/lib/supabase/server";

const NetworkEnum = z.enum(NETWORKS as [Network, ...Network[]]);
const StatusEnum = z.enum(["idea", "draft", "in_review", "approved", "scheduled", "published", "failed"]);

const PostSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  title: z.string().trim().max(200),
  format: z.enum(["post", "carousel", "video", "reel"]),
  caption: z.string().max(70000),
  first_comment: z.string().max(5000),
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
  status: StatusEnum,
  networks: z.array(NetworkEnum),
  overrides: z.record(z.string(), z.string().max(70000).nullable()),
  media_ids: z.array(z.string().uuid()).max(20),
});

export type PostInput = z.infer<typeof PostSchema>;
type Result = { error?: string; id?: string };

function revalidatePostPaths(id?: string, clientId?: string) {
  revalidatePath("/");
  revalidatePath("/calendario");
  if (id) revalidatePath(`/publicaciones/${id}`);
  if (clientId) revalidatePath(`/clientes/${clientId}`, "layout");
}

/** Crea o actualiza la publicación con sus redes y archivos. */
export async function savePost(input: PostInput, isNew: boolean): Promise<Result> {
  await assertCanEdit();
  const parsed = PostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const p = parsed.data;
  const supabase = await createClient();

  // Si ya está programada o aprobada, validar que siga cumpliendo los requisitos
  if (["in_review", "approved", "scheduled"].includes(p.status)) {
    const { data: media } = p.media_ids.length
      ? await supabase.from("media_assets").select("id, kind").in("id", p.media_ids)
      : { data: [] as { id: string; kind: "image" | "video" }[] };
    const err = canMoveTo(p.status, { ...p, media: media ?? [] });
    if (err) return { error: `No se puede guardar como "${STATUS_INFO[p.status].label}": ${err}` };
  }

  const row = {
    id: p.id,
    client_id: p.client_id,
    title: p.title,
    format: p.format,
    caption: p.caption,
    first_comment: p.first_comment,
    scheduled_at: p.scheduled_at,
    status: p.status,
  };
  if (isNew) {
    const me = await requireMember();
    const { error } = await supabase.from("posts").insert({ ...row, created_by: me.id });
    if (error) return { error: "No se pudo crear la publicación: " + error.message };
  } else {
    const { error } = await supabase.from("posts").update(row).eq("id", p.id);
    if (error) return { error: "No se pudo guardar: " + error.message };
  }

  // Redes
  const [{ data: existing }, { data: accounts }] = await Promise.all([
    supabase.from("post_targets").select("id, network, status").eq("post_id", p.id),
    supabase.from("client_social_accounts").select("network, connection").eq("client_id", p.client_id),
  ]);
  const remove = (existing ?? []).filter((t) => !p.networks.includes(t.network) && t.status !== "published").map((t) => t.id);
  if (remove.length) await supabase.from("post_targets").delete().in("id", remove);
  if (p.networks.length) {
    const { error } = await supabase.from("post_targets").upsert(
      p.networks.map((network) => ({
        post_id: p.id,
        network,
        caption_override: p.overrides[network]?.trim() ? p.overrides[network] : null, // texto propio de esta red
        publish_mode: accounts?.find((a) => a.network === network)?.connection === "auto" ? ("auto" as const) : ("manual" as const),
      })),
      { onConflict: "post_id,network" },
    );
    if (error) return { error: "Se guardó, pero no las redes: " + error.message };
  }

  // Archivos (en orden)
  await supabase.from("post_media").delete().eq("post_id", p.id);
  if (p.media_ids.length) {
    const { error } = await supabase.from("post_media").insert(p.media_ids.map((media_id, position) => ({ post_id: p.id, media_id, position })));
    if (error) return { error: "Se guardó, pero no los archivos: " + error.message };
  }

  revalidatePostPaths(p.id, p.client_id);
  return { id: p.id };
}

export async function deletePost(id: string): Promise<Result> {
  await assertCanEdit();
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("client_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePostPaths(undefined, data?.client_id);
  return {};
}

export async function duplicatePost(id: string): Promise<Result> {
  await assertCanEdit();
  const me = await requireMember();
  const supabase = await createClient();
  const { data: p } = await supabase.from("posts").select("*, post_targets(network, caption_override, publish_mode), post_media(media_id, position)").eq("id", id).single();
  if (!p) return { error: "No encontrada" };
  const newId = crypto.randomUUID();
  const { error } = await supabase.from("posts").insert({
    id: newId,
    client_id: p.client_id,
    title: p.title ? `${p.title} (copia)` : "Copia",
    format: p.format,
    caption: p.caption,
    first_comment: p.first_comment,
    status: "draft",
    scheduled_at: null,
    created_by: me.id,
  });
  if (error) return { error: error.message };
  if (p.post_targets.length)
    await supabase.from("post_targets").insert(p.post_targets.map((t) => ({ ...t, post_id: newId })));
  if (p.post_media.length) await supabase.from("post_media").insert(p.post_media.map((m) => ({ ...m, post_id: newId })));
  revalidatePostPaths(newId, p.client_id);
  return { id: newId };
}

/** Cambia solo la fecha (usado al arrastrar en el calendario). */
export async function reschedulePost(id: string, scheduledAt: string): Promise<Result> {
  await assertCanEdit();
  if (Number.isNaN(Date.parse(scheduledAt))) return { error: "Fecha inválida" };
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("status, client_id").eq("id", id).single();
  if (!post) return { error: "No encontrada" };
  if (post.status === "published") return { error: "Una publicación ya publicada no se puede mover." };
  if (post.status === "scheduled" && new Date(scheduledAt).getTime() < Date.now())
    return { error: "No puedes programar en una fecha que ya pasó." };
  const { error } = await supabase
    .from("posts")
    .update({ scheduled_at: new Date(scheduledAt).toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  // Si cambia la fecha, el recordatorio debe volver a enviarse
  await supabase.from("post_targets").update({ reminded_at: null }).eq("post_id", id).eq("status", "pending");
  revalidatePostPaths(id, post.client_id);
  return { id };
}

export async function addComment(postId: string, body: string): Promise<Result> {
  const me = await assertCanEdit();
  const text = body.trim();
  if (!text) return { error: "Escribe un comentario." };
  const supabase = await createClient();
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, body: text.slice(0, 4000), author_user_id: me.id, author_name: me.fullName });
  if (error) return { error: error.message };
  revalidatePath(`/publicaciones/${postId}`);
  return {};
}

const TemplateSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().trim().min(1, "Ponle un nombre a la plantilla").max(80),
  format: z.enum(["post", "carousel", "video", "reel"]),
  caption: z.string().max(70000),
  first_comment: z.string().max(5000),
  networks: z.array(NetworkEnum),
});

export async function saveTemplate(input: z.input<typeof TemplateSchema>): Promise<Result> {
  await assertCanEdit();
  const t = TemplateSchema.safeParse(input);
  if (!t.success) return { error: t.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("templates").insert(t.data).select("id").single();
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${t.data.client_id}/contenido`);
  return { id: data.id };
}

/** Archivos del cliente para el selector del editor. */
export async function listClientMedia(clientId: string) {
  await requireMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, storage_path, kind, filename, duration_s, width, height, tags, folder_id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(300);
  const urls = await signMediaUrls(supabase, (data ?? []).map((a) => a.storage_path));
  return (data ?? []).map(({ storage_path, ...a }) => ({ ...a, url: urls.get(storage_path) ?? "" }));
}

/** Datos del cliente que necesita el editor: redes, plantillas y grupos de hashtags. */
export async function getClientEditorData(clientId: string) {
  await requireMember();
  const supabase = await createClient();
  const [{ data: client }, { data: templates }, { data: hashtagGroups }] = await Promise.all([
    supabase.from("clients").select("id, name, logo_url, color_primary, client_social_accounts(network, handle, connection)").eq("id", clientId).single(),
    supabase.from("templates").select("id, name, format, caption, first_comment, networks").eq("client_id", clientId).order("name"),
    supabase.from("hashtag_groups").select("id, name, hashtags").eq("client_id", clientId).order("name"),
  ]);
  return { client, templates: templates ?? [], hashtagGroups: hashtagGroups ?? [] };
}

export type ClientEditorData = Awaited<ReturnType<typeof getClientEditorData>>;
export type PickerMedia = Awaited<ReturnType<typeof listClientMedia>>[number];
export type { PostStatus };

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canEdit, requireMember } from "@/lib/auth";
import { getActiveClients } from "@/lib/queries";
import { signMediaUrls } from "@/lib/signed-urls";
import { createClient } from "@/lib/supabase/server";
import { getClientEditorData } from "../actions";
import { PostEditor } from "../post-editor";
import { PostActivity } from "./post-activity";

export const metadata: Metadata = { title: "Publicación" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireMember();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "*, post_targets(network, caption_override, status, publish_mode, permalink, published_at, error), post_media(position, media_assets(id, storage_path, kind, filename, duration_s, width, height))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  const [clients, editorData, { data: comments }, { data: history }] = await Promise.all([
    getActiveClients(),
    getClientEditorData(post.client_id),
    supabase.from("post_comments").select("id, author_name, body, is_client, created_at").eq("post_id", id).order("created_at"),
    supabase
      .from("post_status_history")
      .select("id, from_status, to_status, actor_label, created_at, profiles(full_name)")
      .eq("post_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const mediaRows = [...post.post_media].sort((a, b) => a.position - b.position).map((m) => m.media_assets).filter((m) => !!m);
  const urls = await signMediaUrls(supabase, mediaRows.map((m) => m.storage_path));
  // Si el cliente está archivado, igual debe aparecer en el selector
  const clientList = clients.some((c) => c.id === post.client_id)
    ? clients
    : [...clients, { id: post.client_id, name: editorData.client?.name ?? "Cliente archivado" }];

  return (
    <>
      <PostEditor
        key={post.updated_at}
        clients={clientList.map((c) => ({ id: c.id, name: c.name }))}
        editorData={editorData}
        readOnly={!canEdit(user.role)}
        initial={{
          id: post.id,
          client_id: post.client_id,
          title: post.title,
          format: post.format,
          caption: post.caption,
          first_comment: post.first_comment,
          scheduled_at: post.scheduled_at,
          status: post.status,
          networks: post.post_targets.map((t) => t.network),
          overrides: Object.fromEntries(post.post_targets.map((t) => [t.network, t.caption_override])),
          published: post.post_targets.filter((t) => t.status === "published").map((t) => t.network),
          media: mediaRows.map(({ storage_path, ...m }) => ({ ...m, url: urls.get(storage_path) ?? "" })),
        }}
      />
      <PostActivity postId={post.id} canComment={canEdit(user.role)} comments={comments ?? []} history={history ?? []} targets={post.post_targets} />
    </>
  );
}

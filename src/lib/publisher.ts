import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NETWORK_INFO, type Network } from "./constants";
import { decrypt } from "./crypto";
import { MetaError, metaConfigured, publishFacebook, publishInstagram, type PublishInput } from "./meta";
import { notifyTeam } from "./notify";
import type { Database } from "./supabase/database.types";

type DB = SupabaseClient<Database>;
const MAX_ATTEMPTS = 3;

export type RunSummary = { checked: number; reminded: number; published: number; failed: number; completed: number; errors: string[] };

/**
 * Revisa las publicaciones programadas cuya hora ya llegó:
 *  - Redes conectadas a Meta → publica automáticamente.
 *  - Modo manual → envía un recordatorio al equipo (una sola vez).
 * Se ejecuta cada minuto desde /api/cron/publicar.
 */
export async function runPublishing(db: DB, now = new Date()): Promise<RunSummary> {
  const summary: RunSummary = { checked: 0, reminded: 0, published: 0, failed: 0, completed: 0, errors: [] };
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();

  const { data: posts, error } = await db
    .from("posts")
    .select(
      "id, title, caption, first_comment, format, client_id, clients(name), post_targets(id, network, caption_override, publish_mode, status, attempts, reminded_at), post_media(position, media_assets(storage_path, kind))",
    )
    .eq("status", "scheduled")
    .lte("scheduled_at", now.toISOString())
    .gte("scheduled_at", weekAgo)
    .limit(50);
  if (error) throw new Error(error.message);

  for (const post of posts ?? []) {
    summary.checked++;
    const clientName = post.clients?.name ?? "Cliente";
    const label = post.title || "una publicación";
    const pending = post.post_targets.filter((t) => t.status === "pending");

    // 1) Recordatorios del modo manual
    const toRemind = pending.filter((t) => (t.publish_mode === "manual" || !metaConfigured()) && !t.reminded_at);
    if (toRemind.length) {
      const nets = toRemind.map((t) => NETWORK_INFO[t.network].label).join(", ");
      await notifyTeam(db, "publish_due", post.id, `⏰ Es hora de publicar «${label}» de ${clientName} en ${nets}`);
      await db.from("post_targets").update({ reminded_at: now.toISOString() }).in("id", toRemind.map((t) => t.id));
      summary.reminded += toRemind.length;
    }

    // 2) Publicación automática con Meta
    const auto = pending.filter((t) => t.publish_mode === "auto" && metaConfigured() && (t.network === "instagram" || t.network === "facebook"));
    if (auto.length) {
      const media = [...post.post_media].sort((a, b) => a.position - b.position).map((m) => m.media_assets).filter((m) => !!m);
      const { data: signed } = media.length
        ? await db.storage.from("media").createSignedUrls(media.map((m) => m.storage_path), 3600)
        : { data: [] as { signedUrl: string }[] };
      const publishMedia = media.map((m, i) => ({ url: signed?.[i]?.signedUrl ?? "", kind: m.kind }));

      for (const t of auto) {
        try {
          const { data: acc } = await db
            .from("client_social_accounts")
            .select("id, external_id, social_tokens(access_token_encrypted)")
            .eq("client_id", post.client_id)
            .eq("network", t.network)
            .eq("connection", "auto")
            .maybeSingle();
          const enc = acc?.social_tokens?.access_token_encrypted;
          if (!acc?.external_id || !enc) throw new MetaError(`La cuenta de ${NETWORK_INFO[t.network].label} ya no está conectada.`);
          const input: PublishInput = {
            caption: t.caption_override ?? post.caption,
            firstComment: post.first_comment,
            format: post.format,
            media: publishMedia,
          };
          const token = decrypt(enc);
          const res = t.network === "instagram" ? await publishInstagram(acc.external_id, token, input) : await publishFacebook(acc.external_id, token, input);
          await db
            .from("post_targets")
            .update({ status: "published", external_post_id: res.id, permalink: res.permalink, published_at: new Date().toISOString(), error: res.warning ?? null })
            .eq("id", t.id);
          summary.published++;
        } catch (e) {
          const err = e as Error;
          const retry = e instanceof MetaError && e.retryable && t.attempts + 1 < MAX_ATTEMPTS;
          await db
            .from("post_targets")
            .update({ attempts: t.attempts + 1, error: err.message.slice(0, 1000), status: retry ? "pending" : "failed" })
            .eq("id", t.id);
          summary.errors.push(`${label} (${t.network}): ${err.message}`);
          if (!retry) {
            summary.failed++;
            await notifyTeam(db, "publish_failed", post.id, `❌ No se pudo publicar «${label}» de ${clientName} en ${NETWORK_INFO[t.network].label}: ${err.message}`);
          }
        }
      }
    }

    // 3) ¿Terminó? Actualiza el estado de la publicación
    await settlePostStatus(db, post.id, label, clientName);
  }

  await db.from("system_status").upsert({ key: "cron", value: { ...summary, ran_at: now.toISOString() }, updated_at: new Date().toISOString() });
  return summary;
}

/** Si todas las redes se publicaron → Publicado. Si alguna falló definitivamente → Error. */
export async function settlePostStatus(db: DB, postId: string, label?: string, clientName?: string) {
  const { data: post } = await db.from("posts").select("status, title, clients(name), post_targets(status, published_at)").eq("id", postId).single();
  if (!post || !post.post_targets.length) return;
  const all = post.post_targets;
  if (all.every((t) => t.status === "published")) {
    if (post.status !== "published") {
      const last = all.map((t) => t.published_at).filter(Boolean).sort().pop() ?? new Date().toISOString();
      await db.from("posts").update({ status: "published", published_at: last }).eq("id", postId);
      await db.from("post_status_history").insert({ post_id: postId, from_status: post.status, to_status: "published", actor_label: "Publicación" });
      await notifyTeam(db, "published", postId, `🎉 «${label ?? post.title}» de ${clientName ?? post.clients?.name} se publicó en todas sus redes`);
    }
  } else if (all.some((t) => t.status === "failed") && !all.some((t) => t.status === "pending") && post.status !== "failed") {
    await db.from("posts").update({ status: "failed" }).eq("id", postId);
    await db.from("post_status_history").insert({ post_id: postId, from_status: post.status, to_status: "failed", actor_label: "Publicación automática" });
  }
}

export type { Network };

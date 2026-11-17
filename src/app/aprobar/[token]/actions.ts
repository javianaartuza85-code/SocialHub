"use server";

import { revalidatePath } from "next/cache";
import { notifyTeam } from "@/lib/notify";
import { resolveApprovalToken } from "./resolve";

type Result = { error?: string };
type Kind = "approve" | "changes" | "comment";

const MSG = {
  invalid: "Este enlace ya no es válido. Pide uno nuevo a tu agencia.",
  notFound: "No encontramos esta publicación.",
  notPending: "Esta publicación ya no está esperando tu aprobación.",
};

/** Acción del cliente desde el portal: aprobar, pedir cambios o comentar. */
export async function clientAction(token: string, postId: string, kind: Kind, name: string, comment: string): Promise<Result> {
  const ctx = await resolveApprovalToken(token);
  if (!ctx) return { error: MSG.invalid };
  const { admin, client } = ctx;
  const author = (name.trim() || client.contact_name || "Cliente").slice(0, 80);
  const body = comment.trim().slice(0, 4000);

  const { data: post } = await admin.from("posts").select("id, title, status, client_id").eq("id", postId).maybeSingle();
  if (!post || post.client_id !== client.id) return { error: MSG.notFound };
  const label = post.title || "una publicación";

  if (kind === "comment") {
    if (!body) return { error: "Escribe tu comentario." };
  } else if (post.status !== "in_review") {
    return { error: MSG.notPending };
  }
  if (kind === "changes" && !body) return { error: "Cuéntanos qué te gustaría cambiar." };

  if (body) {
    await admin.from("post_comments").insert({ post_id: post.id, author_name: author, body, is_client: true });
  }

  if (kind === "approve" || kind === "changes") {
    const to = kind === "approve" ? "approved" : "draft";
    // Solo cambia si sigue en revisión (evita dobles clics o dos personas a la vez)
    const { data: updated } = await admin.from("posts").update({ status: to }).eq("id", post.id).eq("status", "in_review").select("id");
    if (!updated?.length) return { error: MSG.notPending };
    await admin.from("post_status_history").insert({ post_id: post.id, from_status: "in_review", to_status: to, actor_label: `${author} (cliente)` });
    await notifyTeam(
      admin,
      kind === "approve" ? "client_approved" : "client_changes",
      post.id,
      kind === "approve" ? `✅ ${client.name} aprobó «${label}»` : `✏️ ${client.name} pidió cambios en «${label}»`,
    );
  } else {
    await notifyTeam(admin, "client_comment", post.id, `💬 ${author} (${client.name}) comentó en «${label}»`);
  }

  await admin.from("approval_links").update({ last_used_at: new Date().toISOString() }).eq("id", ctx.linkId);
  revalidatePath(`/aprobar/${token}`);
  revalidatePath(`/publicaciones/${post.id}`);
  revalidatePath("/");
  return {};
}

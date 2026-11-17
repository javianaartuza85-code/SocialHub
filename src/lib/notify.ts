import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

type NotificationType = Database["public"]["Enums"]["notification_type"];

/** Crea una notificación para cada administrador y editor del equipo. */
export async function notifyTeam(admin: SupabaseClient<Database>, type: NotificationType, postId: string | null, message: string) {
  const { data: members } = await admin.from("members").select("user_id").in("role", ["admin", "editor"]);
  if (!members?.length) return;
  await admin.from("notifications").insert(members.map((m) => ({ user_id: m.user_id, type, post_id: postId, message: message.slice(0, 500) })));
}

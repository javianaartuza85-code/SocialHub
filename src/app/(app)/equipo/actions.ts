"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const Role = z.enum(["admin", "editor", "viewer"]);

export async function inviteMember(email: string, role: string): Promise<{ error?: string }> {
  const me = await assertAdmin();
  const parsed = z.object({ email: z.string().trim().toLowerCase().email("Correo inválido"), role: Role }).safeParse({ email, role });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();

  const { data: existing } = await supabase.from("profiles").select("id, members(user_id)").ilike("email", parsed.data.email).maybeSingle();
  if (existing?.members) return { error: "Esa persona ya es parte del equipo." };

  const { error } = await supabase.from("invitations").insert({ email: parsed.data.email, role: parsed.data.role, invited_by: me.id });
  if (error) return { error: error.code === "23505" ? "Ya hay una invitación pendiente para ese correo." : error.message };
  revalidatePath("/equipo");
  return {};
}

export async function revokeInvitation(id: string): Promise<{ error?: string }> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/equipo");
  return {};
}

export async function changeRole(userId: string, role: string): Promise<{ error?: string }> {
  await assertAdmin();
  const r = Role.safeParse(role);
  if (!r.success) return { error: "Rol inválido" };
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ role: r.data }).eq("user_id", userId);
  if (error) return { error: error.message.includes("administrador") ? "Debe quedar al menos un administrador." : error.message };
  revalidatePath("/equipo");
  return {};
}

export async function removeMember(userId: string): Promise<{ error?: string }> {
  const me = await assertAdmin();
  if (me.id === userId) return { error: "No puedes quitarte a ti mismo del equipo." };
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("user_id", userId);
  if (error) return { error: error.message.includes("administrador") ? "Debe quedar al menos un administrador." : error.message };
  revalidatePath("/equipo");
  return {};
}

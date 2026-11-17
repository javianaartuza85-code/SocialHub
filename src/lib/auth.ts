import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { UserRole } from "./constants";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole | null;
};

/** Usuario actual con su rol (null si aún no es miembro del equipo). Se cachea por petición. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("members").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  let role = member?.role ?? null;
  if (!role) {
    // ¿Lo invitaron después de registrarse? Reclama la invitación pendiente.
    const { data } = await supabase.rpc("claim_invitation");
    role = data ?? null;
  }
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "",
    role,
  };
});

export async function requireMember() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.role) redirect("/sin-acceso");
  return user as CurrentUser & { role: UserRole };
}

export function canEdit(role: UserRole | null) {
  return role === "admin" || role === "editor";
}

/** Para server actions: lanza un error si el usuario no puede editar. */
export async function assertCanEdit() {
  const user = await requireMember();
  if (!canEdit(user.role)) throw new Error("Tu rol es de solo lectura.");
  return user;
}

export async function assertAdmin() {
  const user = await requireMember();
  if (user.role !== "admin") throw new Error("Solo un administrador puede hacer esto.");
  return user;
}

"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(fullName: string): Promise<{ error?: string }> {
  const me = await requireMember();
  const name = fullName.trim().slice(0, 100);
  if (!name) return { error: "Escribe tu nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", me.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

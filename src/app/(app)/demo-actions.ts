"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { seedDemoData } from "@/lib/demo/seed";
import { createAdminClient } from "@/lib/supabase/server";

export async function loadDemoData(): Promise<{ error?: string }> {
  try {
    const user = await assertAdmin();
    await seedDemoData(createAdminClient(), { userId: user.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudieron cargar los datos de ejemplo." };
  }
  revalidatePath("/", "layout");
  return {};
}

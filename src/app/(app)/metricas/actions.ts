"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCanEdit, requireMember } from "@/lib/auth";
import { NETWORKS, type Network } from "@/lib/constants";
import { fromInputValue } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const int = z.coerce.number().int().min(0).max(2_000_000_000);
const RowSchema = z.object({
  network: z.enum(NETWORKS as [Network, ...Network[]]),
  followers: int,
  reach: int,
  impressions: int,
  interactions: int,
  posts_count: int,
});

export async function saveMetrics(clientId: string, month: string, rows: z.input<typeof RowSchema>[], notes: string): Promise<{ error?: string }> {
  await assertCanEdit();
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Elige un mes válido." };
  const parsed = z.array(RowSchema).safeParse(rows);
  if (!parsed.success) return { error: "Revisa los números: deben ser enteros positivos." };
  const supabase = await createClient();
  const { error } = await supabase.from("monthly_metrics").upsert(
    parsed.data.map((r) => ({ ...r, client_id: clientId, month: `${month}-01`, notes: notes.trim() || null })),
    { onConflict: "client_id,network,month" },
  );
  if (error) return { error: error.message };
  revalidatePath("/metricas");
  return {};
}

/** Valores ya guardados del mes y cuántas publicaciones se marcaron como publicadas en Social Hub. */
export async function getMonthData(clientId: string, month: string) {
  await requireMember();
  if (!/^\d{4}-\d{2}$/.test(month)) return { saved: [], published: {} as Partial<Record<Network, number>> };
  const supabase = await createClient();
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const from = fromInputValue(`${month}-01T00:00`)!;
  const to = fromInputValue(`${next}-01T00:00`)!;
  const [{ data: saved }, { data: targets }] = await Promise.all([
    supabase.from("monthly_metrics").select("network, followers, reach, impressions, interactions, posts_count, notes").eq("client_id", clientId).eq("month", `${month}-01`),
    supabase.from("post_targets").select("network, posts!inner(client_id)").eq("posts.client_id", clientId).eq("status", "published").gte("published_at", from).lt("published_at", to),
  ]);
  const published: Partial<Record<Network, number>> = {};
  targets?.forEach((t) => (published[t.network] = (published[t.network] ?? 0) + 1));
  return { saved: saved ?? [], published };
}

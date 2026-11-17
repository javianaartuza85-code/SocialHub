import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { canEdit, requireMember } from "@/lib/auth";
import { fmt } from "@/lib/dates";
import type { MetricRow } from "@/lib/metrics";
import { getActiveClients } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { MetricsView } from "./metrics-view";

export const metadata: Metadata = { title: "Métricas" };

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ cliente?: string; meses?: string }> }) {
  const sp = await searchParams;
  const user = await requireMember();
  const clients = await getActiveClients();
  if (!clients.length) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title="Métricas" />
        <EmptyState icon={<BarChart3 />} title="Primero crea un cliente" />
      </div>
    );
  }
  const client = clients.find((c) => c.id === sp.cliente) ?? clients[0];
  const months = sp.meses === "12" ? 12 : 6;

  // Desde el primer día de hace N meses (en la zona de la agencia)
  const current = fmt(new Date(), "yyyy-MM");
  const [cy, cm] = current.split("-").map(Number);
  const startDate = new Date(Date.UTC(cy, cm - 1 - months, 1));
  const start = startDate.toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_metrics")
    .select("network, month, followers, reach, impressions, interactions, posts_count, notes")
    .eq("client_id", client.id)
    .gte("month", start)
    .order("month");

  return (
    <div className="mx-auto max-w-6xl">
      <MetricsView
        key={`${client.id}-${months}`}
        clients={clients.map((c) => ({ id: c.id, name: c.name, networks: c.client_social_accounts.map((a) => a.network) }))}
        clientId={client.id}
        months={months}
        currentMonth={current}
        rows={(data ?? []) as MetricRow[]}
        editable={canEdit(user.role)}
      />
    </div>
  );
}

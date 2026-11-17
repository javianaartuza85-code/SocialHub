import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getCurrentUser } from "@/lib/auth";
import { fmt, fromInputValue } from "@/lib/dates";
import { networksIn, totalsByMonth, type MetricRow } from "@/lib/metrics";
import { MonthlyReport, type ReportData } from "@/lib/report/monthly-report";
import { createClient } from "@/lib/supabase/server";
import type { Network } from "@/lib/constants";

export const dynamic = "force-dynamic";

function monthName(month: string, pattern: string) {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1, 15), pattern, { locale: es });
}

/** Descarga el reporte mensual de un cliente en PDF. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const mes = req.nextUrl.searchParams.get("mes") ?? "";
  const user = await getCurrentUser();
  if (!user?.role) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!/^\d{4}-\d{2}$/.test(mes) || !/^[0-9a-f-]{36}$/i.test(clientId)) return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

  const supabase = await createClient();
  const [y, m] = mes.split("-").map(Number);
  const from6 = new Date(Date.UTC(y, m - 6, 1)).toISOString().slice(0, 10);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  const [{ data: client }, { data: rows }, { data: posts }] = await Promise.all([
    supabase.from("clients").select("name, color_primary, logo_url").eq("id", clientId).maybeSingle(),
    supabase
      .from("monthly_metrics")
      .select("network, month, followers, reach, impressions, interactions, posts_count, notes")
      .eq("client_id", clientId)
      .gte("month", from6)
      .lte("month", `${mes}-01`)
      .order("month"),
    supabase
      .from("posts")
      .select("title, caption, published_at, post_targets(network, status)")
      .eq("client_id", clientId)
      .eq("status", "published")
      .gte("published_at", fromInputValue(`${mes}-01T00:00`)!)
      .lt("published_at", fromInputValue(`${next}-01T00:00`)!)
      .order("published_at"),
  ]);
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const totals = totalsByMonth((rows ?? []) as MetricRow[]);
  const idx = totals.findIndex((t) => t.month === `${mes}-01`);
  if (idx < 0) return NextResponse.json({ error: "No hay métricas registradas para ese mes." }, { status: 404 });

  // El PDF solo admite PNG/JPG: si el logo es otro formato, se usan las iniciales
  let logoPng: string | null = null;
  if (client.logo_url && /\.(png|jpe?g)$/i.test(client.logo_url)) logoPng = client.logo_url;

  const data: ReportData = {
    client: { name: client.name, color: client.color_primary, logoPng },
    monthLabel: monthName(mes, "MMMM 'de' yyyy"),
    current: totals[idx],
    previous: idx > 0 ? totals[idx - 1] : null,
    history: totals.slice(0, idx + 1).map((t) => ({ label: monthName(t.month.slice(0, 7), "MMM yy"), reach: t.reach, followers: t.followers })),
    networks: networksIn((rows ?? []).filter((r) => r.month === `${mes}-01`) as MetricRow[]),
    posts: (posts ?? []).map((p) => ({
      title: p.title || p.caption.slice(0, 60),
      date: fmt(p.published_at!, "d MMM"),
      networks: p.post_targets.filter((t) => t.status === "published").map((t) => t.network as Network),
    })),
    notes: (rows ?? []).find((r) => r.month === `${mes}-01` && r.notes)?.notes ?? null,
    generatedAt: fmt(new Date(), "d MMM yyyy, HH:mm"),
  };

  const pdf = await renderToBuffer(createElement(MonthlyReport, { d: data }) as Parameters<typeof renderToBuffer>[0]);
  const slug = client.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `reporte-${slug}-${mes}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

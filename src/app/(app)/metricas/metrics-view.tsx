"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, FileDown, Minus, PencilLine, Table2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { NetworkBadge } from "@/components/network-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NETWORK_INFO, type Network } from "@/lib/constants";
import { compact, engagement, networksIn, nf, pct, pctChange, SERIES_VAR, totalsByMonth, type MetricRow } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { MetricsForm } from "./metrics-form";

export function monthLabel(month: string, pattern = "MMM yy") {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1, 15), pattern, { locale: es });
}

type ClientOpt = { id: string; name: string; networks: Network[] };

export function MetricsView({
  clients,
  clientId,
  months,
  currentMonth,
  rows,
  editable,
}: {
  clients: ClientOpt[];
  clientId: string;
  months: number;
  currentMonth: string;
  rows: MetricRow[];
  editable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [formOpen, setFormOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const totals = totalsByMonth(rows);
  const nets = networksIn(rows);
  const last = totals.at(-1);
  const prev = totals.at(-2);
  const client = clients.find((c) => c.id === clientId)!;
  const [reportMonth, setReportMonth] = useState(last?.month.slice(0, 7) ?? "");

  const go = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ cliente: clientId, meses: String(months), ...patch });
    router.push(`${pathname}?${p.toString()}`);
  };

  const followersData = totals.map((t) => ({
    month: monthLabel(t.month),
    ...Object.fromEntries(nets.map((n) => [n, t.byNetwork[n]?.followers ?? null])),
  }));
  const barData = totals.map((t) => ({ month: monthLabel(t.month), reach: t.reach, interactions: t.interactions }));

  const kpis = last
    ? [
        { label: "Seguidores", value: nf.format(last.followers), change: pctChange(last.followers, prev?.followers) },
        { label: "Alcance", value: compact.format(last.reach), change: pctChange(last.reach, prev?.reach) },
        { label: "Interacciones", value: compact.format(last.interactions), change: pctChange(last.interactions, prev?.interactions) },
        {
          label: "Tasa de interacción",
          value: pct.format(engagement(last.interactions, last.reach)),
          change: prev ? pctChange(engagement(last.interactions, last.reach), engagement(prev.interactions, prev.reach)) : null,
        },
      ]
    : [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {last ? `Datos hasta ${monthLabel(last.month, "MMMM 'de' yyyy")}.` : "Aún no hay métricas registradas."} Se registran a mano cada mes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <PencilLine /> Registrar métricas
            </Button>
          )}
        </div>
      </div>

      {/* Filtros en una fila */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
        <div className="col-span-2 grid gap-1.5 sm:w-56">
          <Label htmlFor="m-client">Cliente</Label>
          <NativeSelect id="m-client" value={clientId} onChange={(e) => go({ cliente: e.target.value })}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid min-w-0 gap-1.5 sm:w-44">
          <Label htmlFor="m-range">Periodo</Label>
          <NativeSelect id="m-range" value={String(months)} onChange={(e) => go({ meses: e.target.value })}>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
          </NativeSelect>
        </div>
        {totals.length > 0 && (
          <div className="grid min-w-0 gap-1.5 sm:ml-auto sm:w-auto">
            <Label htmlFor="m-report">Reporte mensual</Label>
            <div className="flex gap-2">
              <NativeSelect id="m-report" className="min-w-0 flex-1 sm:w-40" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}>
                {[...totals].reverse().map((t) => (
                  <option key={t.month} value={t.month.slice(0, 7)}>
                    {monthLabel(t.month, "MMMM yyyy")}
                  </option>
                ))}
              </NativeSelect>
              <Button asChild>
                <a href={`/api/reportes/${clientId}?mes=${reportMonth}`} download>
                  <FileDown /> PDF
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {totals.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No hay métricas en este periodo.{" "}
          {editable && (
            <button className="font-medium text-primary hover:underline" onClick={() => setFormOpen(true)}>
              Registra las del último mes
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{k.value}</p>
                <Delta value={k.change} />
              </div>
            ))}
          </div>

          <ChartCard title="Seguidores por red" subtitle="Al cierre de cada mes">
            {nets.length > 1 && <Legend nets={nets} />}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={followersData} margin={{ top: 8, right: 84, bottom: 0, left: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(v) => compact.format(v)} />
                  <Tooltip content={<SeriesTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
                  {nets.map((n) => (
                    <Line
                      key={n}
                      dataKey={n}
                      name={NETWORK_INFO[n].label}
                      stroke={SERIES_VAR[n]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                      isAnimationActive={false}
                      connectNulls
                    >
                      {/* Etiqueta directa al final de cada línea (nombre de la red) */}
                      <LabelList
                        dataKey={n}
                        content={(props) => {
                          const { x, y, index } = props as { x: number; y: number; index: number };
                          if (index !== followersData.length - 1) return null;
                          return (
                            <text x={Number(x) + 8} y={Number(y)} dy={4} fontSize={12} fill="var(--muted-foreground)">
                              {NETWORK_INFO[n].label}
                            </text>
                          );
                        }}
                      />
                    </Line>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Alcance" subtitle="Personas alcanzadas, suma de todas las redes">
              <MonthlyBars data={barData} dataKey="reach" name="Alcance" />
            </ChartCard>
            <ChartCard title="Interacciones" subtitle="Me gusta, comentarios, compartidos y guardados">
              <MonthlyBars data={barData} dataKey="interactions" name="Interacciones" />
            </ChartCard>
          </div>

          <section className="grid gap-3">
            <Button variant="outline" className="w-fit" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
              <Table2 /> {showTable ? "Ocultar tabla" : "Ver tabla de datos"}
            </Button>
            {showTable && <DataTable totals={totals} nets={nets} />}
          </section>
        </>
      )}

      {formOpen && (
        <MetricsForm
          open={formOpen}
          onOpenChange={setFormOpen}
          clientId={clientId}
          clientName={client.name}
          networks={client.networks.length ? client.networks : nets}
          defaultMonth={(() => {
            const [y, m] = currentMonth.split("-").map(Number);
            return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
          })()}
        />
      )}
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <p className="mt-1 text-xs text-muted-foreground">Sin mes anterior</p>;
  const up = value > 0.0005;
  const down = value < -0.0005;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", up && "text-success", down && "text-destructive", !up && !down && "text-muted-foreground")}>
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {pct.format(value)} <span className="font-normal text-muted-foreground">vs. mes anterior</span>
    </p>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Legend({ nets }: { nets: Network[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
      {nets.map((n) => (
        <li key={n} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: SERIES_VAR[n] }} />
          {NETWORK_INFO[n].label}
        </li>
      ))}
    </ul>
  );
}

function MonthlyBars({ data, dataKey, name }: { data: { month: string; reach: number; interactions: number }[]; dataKey: "reach" | "interactions"; name: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%" accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(v) => compact.format(v)} />
          <Tooltip content={<SeriesTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey={dataKey} name={name} fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SeriesTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const items = [...payload].filter((p) => p.value != null).sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium capitalize">{label}</p>
      {items.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: String(p.color) }} />
          <span className="flex-1 text-muted-foreground">{p.name}</span>
          <span className="font-medium tabular-nums">{nf.format(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

function DataTable({ totals, nets }: { totals: ReturnType<typeof totalsByMonth>; nets: Network[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Métricas por mes y red</caption>
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Mes</th>
            <th className="px-3 py-2 text-left font-medium">Red</th>
            <th className="px-3 py-2 text-right font-medium">Seguidores</th>
            <th className="px-3 py-2 text-right font-medium">Alcance</th>
            <th className="px-3 py-2 text-right font-medium">Impresiones</th>
            <th className="px-3 py-2 text-right font-medium">Interacciones</th>
            <th className="px-3 py-2 text-right font-medium">Tasa</th>
            <th className="px-3 py-2 text-right font-medium">Publicaciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {[...totals].reverse().flatMap((t) =>
            nets
              .filter((n) => t.byNetwork[n])
              .map((n, i) => {
                const r = t.byNetwork[n]!;
                return (
                  <tr key={`${t.month}-${n}`}>
                    <td className="px-3 py-2 capitalize">{i === 0 ? monthLabel(t.month, "MMMM yyyy") : ""}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <NetworkBadge network={n} size="xs" /> {NETWORK_INFO[n].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf.format(r.followers)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf.format(r.reach)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf.format(r.impressions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf.format(r.interactions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct.format(engagement(r.interactions, r.reach))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.posts_count}</td>
                  </tr>
                );
              }),
          )}
        </tbody>
      </table>
    </div>
  );
}

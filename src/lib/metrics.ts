import { NETWORKS, type Network } from "./constants";

/** Color fijo por red (la red conserva su color aunque se filtren otras). */
export const SERIES_VAR: Record<Network, string> = {
  instagram: "var(--series-1)",
  facebook: "var(--series-2)",
  tiktok: "var(--series-3)",
  linkedin: "var(--series-4)",
  x: "var(--series-5)",
};
/** Los mismos colores en hexadecimal (modo claro) para el PDF. */
export const SERIES_HEX: Record<Network, string> = {
  instagram: "#2a78d6",
  facebook: "#eb6834",
  tiktok: "#1baf7a",
  linkedin: "#eda100",
  x: "#e87ba4",
};

export type MetricRow = {
  network: Network;
  month: string; // yyyy-MM-01
  followers: number;
  reach: number;
  impressions: number;
  interactions: number;
  posts_count: number;
  notes: string | null;
};

export type MonthTotals = { month: string; followers: number; reach: number; impressions: number; interactions: number; posts: number; byNetwork: Partial<Record<Network, MetricRow>> };

export function totalsByMonth(rows: MetricRow[]): MonthTotals[] {
  const map = new Map<string, MonthTotals>();
  for (const r of rows) {
    const t = map.get(r.month) ?? { month: r.month, followers: 0, reach: 0, impressions: 0, interactions: 0, posts: 0, byNetwork: {} };
    t.followers += r.followers;
    t.reach += r.reach;
    t.impressions += r.impressions;
    t.interactions += r.interactions;
    t.posts += r.posts_count;
    t.byNetwork[r.network] = r;
    map.set(r.month, t);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Tasa de interacción = interacciones / alcance. */
export function engagement(interactions: number, reach: number) {
  return reach > 0 ? interactions / reach : 0;
}

export function pctChange(curr: number, prev: number | undefined) {
  if (prev === undefined || prev === 0) return null;
  return (curr - prev) / prev;
}

export const nf = new Intl.NumberFormat("es-CO");
const oneDecimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
/** Abreviado uniforme: 950 · 9,7 k · 1,2 M */
export const compact = {
  format(n: number) {
    const a = Math.abs(n);
    if (a >= 1e6) return `${oneDecimal.format(n / 1e6)} M`;
    if (a >= 1e3) return `${oneDecimal.format(n / 1e3)} k`;
    return oneDecimal.format(n);
  },
};
export const pct = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });

export function networksIn(rows: MetricRow[]): Network[] {
  const set = new Set(rows.map((r) => r.network));
  return NETWORKS.filter((n) => set.has(n));
}

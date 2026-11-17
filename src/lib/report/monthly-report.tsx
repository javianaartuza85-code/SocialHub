import { Document, G, Page, Rect, StyleSheet, Svg, Text, View, Image, Line } from "@react-pdf/renderer";
import { NETWORK_INFO, type Network } from "@/lib/constants";
import { compact, engagement, nf, pct, pctChange, SERIES_HEX, type MonthTotals } from "@/lib/metrics";

export type ReportData = {
  client: { name: string; color: string; logoPng: string | null };
  monthLabel: string;
  current: MonthTotals;
  previous: MonthTotals | null;
  history: { label: string; reach: number; followers: number }[];
  networks: Network[];
  posts: { title: string; date: string; networks: Network[] }[];
  notes: string | null;
  generatedAt: string;
};

const INK = "#0b0b0b";
const MUTED = "#52514e";
const LINE = "#e7e6e2";
const GOOD = "#0f7b3d";
const BAD = "#c2362f";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 12 },
  logoBox: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 16, fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  sub: { color: MUTED, fontSize: 10, marginTop: 2 },
  bar: { height: 3, marginBottom: 18, borderRadius: 2 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 14 },
  kpis: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 10 },
  kpiLabel: { color: MUTED, fontSize: 9 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 4 },
  kpiDelta: { fontSize: 8.5, marginTop: 3 },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: LINE, paddingVertical: 6, paddingHorizontal: 8 },
  th: { color: MUTED, fontSize: 8.5 },
  cell: { flex: 1, textAlign: "right" },
  cellFirst: { flex: 1.4, flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  note: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4, color: INK, lineHeight: 1.4 },
  post: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderColor: LINE },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", color: MUTED, fontSize: 8 },
});

function stripEmoji(t: string) {
  // La fuente estándar del PDF no incluye emojis
  return t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").trim();
}

function Delta({ curr, prev }: { curr: number; prev: number | undefined }) {
  const c = pctChange(curr, prev);
  if (c === null) return <Text style={[s.kpiDelta, { color: MUTED }]}>Sin mes anterior</Text>;
  const up = c > 0.0005;
  const down = c < -0.0005;
  return (
    <Text style={[s.kpiDelta, { color: up ? GOOD : down ? BAD : MUTED }]}>
      {up ? "+" : down ? "−" : "="}
      {pct.format(Math.abs(c))} vs. mes anterior
    </Text>
  );
}

/** Gráfica de barras simple (alcance por mes), dibujada a mano para el PDF. */
function ReachBars({ data, color }: { data: { label: string; reach: number }[]; color: string }) {
  const W = 520;
  const H = 120;
  const pad = 18;
  const max = Math.max(...data.map((d) => d.reach), 1);
  const slot = W / data.length;
  const bw = Math.min(36, slot * 0.55);
  return (
    <Svg width={W} height={H + pad}>
      <Line x1={0} y1={H} x2={W} y2={H} stroke={LINE} strokeWidth={1} />
      {data.map((d, i) => {
        const h = Math.max(2, (d.reach / max) * (H - 16));
        const x = i * slot + (slot - bw) / 2;
        return (
          <G key={i}>
            <Rect x={x} y={H - h} width={bw} height={h} fill={color} rx={3} ry={3} />
            <Text x={x + bw / 2} y={H - h - 4} style={{ fontSize: 7, fill: MUTED }} textAnchor="middle">
              {compact.format(d.reach)}
            </Text>
            <Text x={x + bw / 2} y={H + 12} style={{ fontSize: 7.5, fill: MUTED }} textAnchor="middle">
              {d.label}
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}

export function MonthlyReport({ d }: { d: ReportData }) {
  const cur = d.current;
  const prev = d.previous ?? undefined;
  const initials = d.client.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Document title={`Reporte ${d.client.name} - ${d.monthLabel}`} author="Social Hub" language="es">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {d.client.logoPng ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={d.client.logoPng} style={{ width: 40, height: 40, borderRadius: 8 }} />
          ) : (
            <View style={[s.logoBox, { backgroundColor: d.client.color }]}>
              <Text style={s.logoText}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={s.h1}>{d.client.name}</Text>
            <Text style={s.sub}>Reporte de redes sociales · {d.monthLabel}</Text>
          </View>
        </View>
        <View style={[s.bar, { backgroundColor: d.client.color }]} />

        <Text style={[s.h2, { marginTop: 0 }]}>Resumen del mes</Text>
        <View style={s.kpis}>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Seguidores</Text>
            <Text style={s.kpiValue}>{nf.format(cur.followers)}</Text>
            <Delta curr={cur.followers} prev={prev?.followers} />
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Alcance</Text>
            <Text style={s.kpiValue}>{nf.format(cur.reach)}</Text>
            <Delta curr={cur.reach} prev={prev?.reach} />
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Interacciones</Text>
            <Text style={s.kpiValue}>{nf.format(cur.interactions)}</Text>
            <Delta curr={cur.interactions} prev={prev?.interactions} />
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Tasa de interacción</Text>
            <Text style={s.kpiValue}>{pct.format(engagement(cur.interactions, cur.reach))}</Text>
            <Delta curr={engagement(cur.interactions, cur.reach)} prev={prev ? engagement(prev.interactions, prev.reach) : undefined} />
          </View>
        </View>

        <Text style={s.h2}>Por red social</Text>
        <View style={s.table}>
          <View style={[s.tr, { backgroundColor: "#f6f5f2" }]}>
            <Text style={[s.th, { flex: 1.4 }]}>Red</Text>
            <Text style={[s.th, s.cell]}>Seguidores</Text>
            <Text style={[s.th, s.cell]}>Variación</Text>
            <Text style={[s.th, s.cell]}>Alcance</Text>
            <Text style={[s.th, s.cell]}>Interacciones</Text>
            <Text style={[s.th, s.cell]}>Tasa</Text>
            <Text style={[s.th, s.cell]}>Publicaciones</Text>
          </View>
          {d.networks.map((n, i) => {
            const r = cur.byNetwork[n];
            if (!r) return null;
            const p = prev?.byNetwork[n];
            const diff = p ? r.followers - p.followers : null;
            return (
              <View key={n} style={[s.tr, i === d.networks.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <View style={s.cellFirst}>
                  <View style={[s.dot, { backgroundColor: SERIES_HEX[n] }]} />
                  <Text>{NETWORK_INFO[n].label}</Text>
                </View>
                <Text style={s.cell}>{nf.format(r.followers)}</Text>
                <Text style={[s.cell, { color: diff === null ? MUTED : diff >= 0 ? GOOD : BAD }]}>
                  {diff === null ? "—" : `${diff >= 0 ? "+" : ""}${nf.format(diff)}`}
                </Text>
                <Text style={s.cell}>{nf.format(r.reach)}</Text>
                <Text style={s.cell}>{nf.format(r.interactions)}</Text>
                <Text style={s.cell}>{pct.format(engagement(r.interactions, r.reach))}</Text>
                <Text style={s.cell}>{r.posts_count}</Text>
              </View>
            );
          })}
        </View>

        {d.history.length > 1 && (
          <>
            <Text style={s.h2}>Alcance de los últimos meses</Text>
            <ReachBars data={d.history} color="#2a78d6" />
          </>
        )}

        {d.notes && (
          <>
            <Text style={s.h2}>Comentarios de la agencia</Text>
            <Text style={[s.note, { borderColor: d.client.color }]}>{stripEmoji(d.notes)}</Text>
          </>
        )}

        {d.posts.length > 0 && (
          <>
            <Text style={s.h2}>Publicaciones del mes ({d.posts.length})</Text>
            {d.posts.slice(0, 18).map((p, i) => (
              <View key={i} style={s.post} wrap={false}>
                <Text style={{ width: 70, color: MUTED }}>{p.date}</Text>
                <Text style={{ flex: 1 }}>{stripEmoji(p.title) || "Sin título"}</Text>
                <Text style={{ color: MUTED }}>{p.networks.map((n) => NETWORK_INFO[n].label).join(", ")}</Text>
              </View>
            ))}
          </>
        )}

        <View style={s.footer} fixed>
          <Text>Generado con Social Hub · {d.generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

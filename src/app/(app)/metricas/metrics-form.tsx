"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { NetworkBadge } from "@/components/network-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NETWORK_INFO, type Network } from "@/lib/constants";
import { getMonthData, saveMetrics } from "./actions";

const FIELDS = [
  { key: "followers", label: "Seguidores" },
  { key: "reach", label: "Alcance" },
  { key: "impressions", label: "Impresiones" },
  { key: "interactions", label: "Interacciones" },
  { key: "posts_count", label: "Publicaciones" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];
type Values = Record<Network, Record<FieldKey, string>>;

const empty = (): Record<FieldKey, string> => ({ followers: "", reach: "", impressions: "", interactions: "", posts_count: "" });

export function MetricsForm({
  open,
  onOpenChange,
  clientId,
  clientName,
  networks,
  defaultMonth,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  clientName: string;
  networks: Network[];
  defaultMonth: string;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [values, setValues] = useState<Values>({} as Values);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();
  const netKey = networks.join(",");

  useEffect(() => {
    const networks = netKey.split(",").filter(Boolean) as Network[];
    let alive = true;
    setLoading(true);
    getMonthData(clientId, month).then(({ saved, published }) => {
      if (!alive) return;
      const v = {} as Values;
      for (const n of networks) {
        const s = saved.find((r) => r.network === n);
        v[n] = s
          ? { followers: String(s.followers), reach: String(s.reach), impressions: String(s.impressions), interactions: String(s.interactions), posts_count: String(s.posts_count) }
          : { ...empty(), posts_count: published[n] ? String(published[n]) : "" };
      }
      setValues(v);
      setNotes(saved.find((r) => r.notes)?.notes ?? "");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [clientId, month, netKey]);

  function set(n: Network, k: FieldKey, v: string) {
    setValues((s) => ({ ...s, [n]: { ...s[n], [k]: v.replace(/[^\d]/g, "") } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registrar métricas de {clientName}</DialogTitle>
          <DialogDescription>Copia los datos de las estadísticas de cada red. Deja en blanco las redes que no quieras registrar.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5 sm:w-52">
          <Label htmlFor="metrics-month">Mes</Label>
          <Input id="metrics-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        {loading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando…
          </p>
        ) : (
          <div className="grid gap-3">
            {networks.map((n) => (
              <fieldset key={n} className="grid gap-2 rounded-lg border p-3">
                <legend className="flex items-center gap-1.5 px-1 text-sm font-medium">
                  <NetworkBadge network={n} size="xs" /> {NETWORK_INFO[n].label}
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="grid gap-1">
                      <Label htmlFor={`${n}-${f.key}`} className="text-xs text-muted-foreground">
                        {f.label}
                      </Label>
                      <Input
                        id={`${n}-${f.key}`}
                        aria-label={`${f.label} en ${NETWORK_INFO[n].label}`}
                        inputMode="numeric"
                        value={values[n]?.[f.key] ?? ""}
                        onChange={(e) => set(n, f.key, e.target.value)}
                        className="tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="grid gap-1.5">
              <Label htmlFor="metrics-notes">Notas del mes (salen en el reporte PDF)</Label>
              <Textarea id="metrics-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. La campaña de Navidad duplicó el alcance." />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={pending || loading}
            onClick={() =>
              start(async () => {
                const rows = networks
                  .filter((n) => FIELDS.some((f) => values[n]?.[f.key]))
                  .map((n) => ({
                    network: n,
                    followers: Number(values[n].followers || 0),
                    reach: Number(values[n].reach || 0),
                    impressions: Number(values[n].impressions || 0),
                    interactions: Number(values[n].interactions || 0),
                    posts_count: Number(values[n].posts_count || 0),
                  }));
                if (!rows.length) return void toast.error("Completa al menos una red.");
                const r = await saveMetrics(clientId, month, rows, notes);
                if (r.error) return void toast.error(r.error);
                toast.success("Métricas guardadas");
                onOpenChange(false);
                router.refresh();
              })
            }
          >
            Guardar métricas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

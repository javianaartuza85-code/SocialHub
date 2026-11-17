"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { DatesSetArg, EventClickArg, EventContentArg, EventDropArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Lightbulb, List, Loader2, Plus, Rows3 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NetworkBadge } from "@/components/network-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { NETWORK_INFO, NETWORKS, STATUS_INFO, STATUS_ORDER, type Network, type PostStatus } from "@/lib/constants";
import { fromWallClockDate, toWallClock, wallClockNow } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { reschedulePost } from "../publicaciones/actions";

type ClientOpt = { id: string; name: string; color: string; logo_url: string | null };
type Row = {
  id: string;
  title: string;
  caption: string;
  status: PostStatus;
  format: string;
  scheduled_at: string | null;
  client_id: string;
  post_targets: { network: Network }[];
};

const VIEWS = [
  { id: "dayGridMonth", label: "Mes", icon: CalendarDays },
  { id: "timeGridWeek", label: "Semana", icon: Rows3 },
  { id: "listMonth", label: "Lista", icon: List },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

export function ContentCalendar({ clients, editable }: { clients: ClientOpt[]; editable: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const calRef = useRef<FullCalendar>(null);
  const [title, setTitle] = useState("");
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [ideas, setIdeas] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // Los filtros y la vista viven en el estado; la dirección (URL) solo los refleja.
  const [filters, setFilters] = useState(() => ({
    cliente: sp.get("cliente") ?? "",
    red: (sp.get("red") ?? "") as Network | "",
    estado: (sp.get("estado") ?? "") as PostStatus | "",
  }));
  const [view, setView] = useState<ViewId>(() => (sp.get("vista") as ViewId) || "dayGridMonth");

  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.cliente) p.set("cliente", filters.cliente);
    if (filters.red) p.set("red", filters.red);
    if (filters.estado) p.set("estado", filters.estado);
    p.set("vista", view);
    window.history.replaceState(null, "", `${pathname}?${p.toString()}`);
  }, [filters, view, pathname]);
  const clientById = new Map(clients.map((c) => [c.id, c]));

  // En el celular, la vista de lista es más cómoda si no se eligió otra
  useEffect(() => {
    if (!sp.get("vista") && window.innerWidth < 640) changeView("listMonth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFilter(k: keyof typeof filters, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function changeView(v: ViewId) {
    setView(v);
    calRef.current?.getApi().changeView(v);
  }

  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!range) return;
    const myId = ++requestId.current;
    setLoading(true);
    const supabase = createClient();
    // margen de un día por la diferencia horaria
    const from = new Date(range.start.getTime() - 864e5).toISOString();
    const to = new Date(range.end.getTime() + 864e5).toISOString();
    const sel = filters.red
      ? "id, title, caption, status, format, scheduled_at, client_id, post_targets!inner(network)"
      : "id, title, caption, status, format, scheduled_at, client_id, post_targets(network)";
    let q = supabase.from("posts").select(sel).gte("scheduled_at", from).lt("scheduled_at", to).order("scheduled_at");
    let qi = supabase.from("posts").select(sel).is("scheduled_at", null).order("created_at", { ascending: false }).limit(30);
    if (filters.cliente) {
      q = q.eq("client_id", filters.cliente);
      qi = qi.eq("client_id", filters.cliente);
    } else {
      // Solo clientes activos
      const ids = clients.map((c) => c.id);
      q = q.in("client_id", ids);
      qi = qi.in("client_id", ids);
    }
    if (filters.estado) {
      q = q.eq("status", filters.estado);
      qi = qi.eq("status", filters.estado);
    }
    if (filters.red) {
      q = q.eq("post_targets.network", filters.red);
      qi = qi.eq("post_targets.network", filters.red);
    }
    const [{ data, error }, { data: ideaRows }] = await Promise.all([q, qi]);
    if (myId !== requestId.current) return; // llegó una respuesta más nueva
    if (error) toast.error("No se pudo cargar el calendario: " + error.message);
    setRows((data as unknown as Row[]) ?? []);
    setIdeas((ideaRows as unknown as Row[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, filters.cliente, filters.red, filters.estado]);

  useEffect(() => {
    load();
  }, [load]);

  const events = rows.map((r) => {
    const c = clientById.get(r.client_id);
    return {
      id: r.id,
      title: r.title || r.caption.slice(0, 40) || "Sin título",
      start: toWallClock(r.scheduled_at!),
      backgroundColor: "transparent",
      borderColor: "transparent",
      editable: editable && r.status !== "published",
      extendedProps: { row: r, color: c?.color ?? "#6366f1", clientName: c?.name ?? "" },
    };
  });

  async function onDrop(info: EventDropArg) {
    const iso = fromWallClockDate(info.event.start!);
    if (!iso) return info.revert();
    const res = await reschedulePost(info.event.id, iso);
    if (res.error) {
      toast.error(res.error);
      info.revert();
    } else {
      toast.success("Publicación reprogramada");
      setRows((rs) => rs.map((r) => (r.id === info.event.id ? { ...r, scheduled_at: iso } : r)));
    }
  }

  function onDateClick(info: DateClickArg) {
    if (!editable) return;
    const d = info.date;
    const p = (n: number) => String(n).padStart(2, "0");
    const day = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
    const fecha = info.allDay ? day : `${day}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
    const qs = new URLSearchParams({ fecha });
    if (filters.cliente) qs.set("cliente", filters.cliente);
    router.push(`/publicaciones/nueva?${qs.toString()}`);
  }

  return (
    <div className="grid gap-4">
      {/* Barra superior */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">{title || "Calendario"}</h1>
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <Button variant="outline" size="icon" aria-label="Anterior" onClick={() => calRef.current?.getApi().prev()} className="rounded-r-none">
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={() => calRef.current?.getApi().today()} className="rounded-none border-x-0">
              Hoy
            </Button>
            <Button variant="outline" size="icon" aria-label="Siguiente" onClick={() => calRef.current?.getApi().next()} className="rounded-l-none">
              <ChevronRight />
            </Button>
          </div>
          <div className="inline-flex rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Vista">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={view === v.id}
                aria-label={v.label}
                onClick={() => changeView(v.id)}
                className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground", view === v.id && "bg-background text-foreground shadow-sm")}
              >
                <v.icon className="size-4" />
                <span className="sr-only sm:not-sr-only">{v.label}</span>
              </button>
            ))}
          </div>
          {editable && (
            <Button asChild className="hidden sm:inline-flex">
              <Link href={`/publicaciones/nueva${filters.cliente ? `?cliente=${filters.cliente}` : ""}`}>
                <Plus /> Nueva
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <NativeSelect aria-label="Filtrar por cliente" className="col-span-2 min-w-0 sm:w-52" value={filters.cliente} onChange={(e) => setFilter("cliente", e.target.value)}>
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filtrar por red" className="min-w-0 sm:w-40" value={filters.red} onChange={(e) => setFilter("red", e.target.value)}>
          <option value="">Todas las redes</option>
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {NETWORK_INFO[n].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filtrar por estado" className="min-w-0 sm:w-44" value={filters.estado} onChange={(e) => setFilter("estado", e.target.value)}>
          <option value="">Todos los estados</option>
          {[...STATUS_ORDER, "failed" as const].map((s) => (
            <option key={s} value={s}>
              {STATUS_INFO[s].label}
            </option>
          ))}
        </NativeSelect>
        {(filters.cliente || filters.red || filters.estado) && (
          <Button variant="ghost" size="sm" className="col-span-2 h-9 w-fit" onClick={() => setFilters({ cliente: "", red: "", estado: "" })}>
            Quitar filtros
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card p-2 sm:p-3" data-testid="calendar">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          locale={esLocale}
          timeZone="UTC"
          now={wallClockNow}
          headerToolbar={false}
          height="auto"
          dayMaxEvents={3}
          events={events}
          editable={editable}
          eventDurationEditable={false}
          defaultTimedEventDuration="00:45"
          displayEventEnd={false}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          allDaySlot={false}
          nowIndicator
          noEventsContent="No hay publicaciones en este periodo."
          datesSet={(arg: DatesSetArg) => {
            setTitle(arg.view.title);
            setRange((r) => (r && r.start.getTime() === arg.start.getTime() && r.end.getTime() === arg.end.getTime() ? r : { start: arg.start, end: arg.end }));
          }}
          eventClick={(info: EventClickArg) => {
            info.jsEvent.preventDefault();
            router.push(`/publicaciones/${info.event.id}`);
          }}
          eventDrop={onDrop}
          dateClick={onDateClick}
          eventContent={(arg: EventContentArg) => <EventChip arg={arg} />}
        />
      </div>

      {ideas.length > 0 && (
        <section className="grid gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lightbulb className="size-4" /> Sin fecha ({ideas.length})
          </h2>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {ideas.map((r) => {
              const c = clientById.get(r.client_id);
              return (
                <li key={r.id} className="w-56 shrink-0">
                  <Link href={`/publicaciones/${r.id}`} className="grid gap-1.5 rounded-lg border bg-card p-3 text-sm hover:shadow-sm" style={{ borderLeft: `4px solid ${c?.color}` }}>
                    <span className="truncate font-medium">{r.title || "Sin título"}</span>
                    <span className="truncate text-xs text-muted-foreground">{c?.name}</span>
                    <StatusBadge status={r.status} className="w-fit" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function EventChip({ arg }: { arg: EventContentArg }) {
  const { row, color, clientName } = arg.event.extendedProps as { row: Row; color: string; clientName: string };
  const isList = arg.view.type.startsWith("list");
  if (isList) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{arg.event.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{clientName}</span>
        </span>
        <span className="hidden gap-0.5 sm:flex">
          {row.post_targets.map((t) => (
            <NetworkBadge key={t.network} network={t.network} size="xs" />
          ))}
        </span>
        <StatusBadge status={row.status} />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-md border-l-[3px] bg-muted/70 px-1.5 py-0.5 text-[11px] leading-tight text-foreground hover:bg-accent",
        row.status === "published" && "opacity-60",
      )}
      style={{ borderLeftColor: color }}
      title={`${clientName} · ${arg.event.title} · ${STATUS_INFO[row.status].label}`}
    >
      <div className="flex items-center gap-1">
        <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_INFO[row.status].dot)} />
        <span className="font-medium tabular-nums">{arg.timeText}</span>
        <span className="ml-auto flex gap-0.5">
          {row.post_targets.slice(0, 3).map((t) => (
            <NetworkBadge key={t.network} network={t.network} size="xs" className="size-3 text-[6px]" />
          ))}
        </span>
      </div>
      <div className="truncate">{arg.event.title}</div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarClock,
  Copy,
  Eye,
  FileText,
  Hash,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { NetworkBadge } from "@/components/network-badge";
import { PostPreview } from "@/components/previews/post-preview";
import { MediaThumb } from "@/components/media-thumb";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  charCount,
  countHashtags,
  FORMAT_INFO,
  NETWORK_INFO,
  NETWORKS,
  STATUS_INFO,
  STATUS_ORDER,
  type Network,
  type PostFormat,
  type PostStatus,
} from "@/lib/constants";
import { fromInputValue, toInputValue } from "@/lib/dates";
import { canMoveTo, checkPost } from "@/lib/post-rules";
import { cn } from "@/lib/utils";
import {
  deletePost,
  duplicatePost,
  getClientEditorData,
  savePost,
  saveTemplate,
  type ClientEditorData,
} from "./actions";
import { MediaPicker, type EditorMedia } from "./media-picker";

export type EditorInitial = {
  id?: string;
  client_id: string;
  title: string;
  format: PostFormat;
  caption: string;
  first_comment: string;
  scheduled_at: string | null;
  status: PostStatus;
  networks: Network[];
  overrides: Partial<Record<Network, string | null>>;
  published: Network[];
  media: EditorMedia[];
};

const NEXT_STEP: Partial<Record<PostStatus, { to: PostStatus; label: string }>> = {
  idea: { to: "draft", label: "Pasar a borrador" },
  draft: { to: "in_review", label: "Enviar a revisión" },
  in_review: { to: "approved", label: "Aprobar" },
  approved: { to: "scheduled", label: "Programar" },
};

export function PostEditor({
  initial,
  clients,
  editorData: initialEditorData,
  readOnly,
}: {
  initial: EditorInitial;
  clients: { id: string; name: string }[];
  editorData: ClientEditorData;
  readOnly: boolean;
}) {
  const router = useRouter();
  const isNew = !initial.id;
  const id = useMemo(() => initial.id ?? crypto.randomUUID(), [initial.id]);

  const [clientId, setClientId] = useState(initial.client_id);
  const [editorData, setEditorData] = useState(initialEditorData);
  const [title, setTitle] = useState(initial.title);
  const [format, setFormat] = useState<PostFormat>(initial.format);
  const [networks, setNetworks] = useState<Network[]>(initial.networks);
  const [caption, setCaption] = useState(initial.caption);
  const [overrides, setOverrides] = useState(initial.overrides);
  const [firstComment, setFirstComment] = useState(initial.first_comment);
  const [media, setMedia] = useState<EditorMedia[]>(initial.media);
  const [when, setWhen] = useState(toInputValue(initial.scheduled_at));
  const [status, setStatus] = useState<PostStatus>(initial.status);
  const [previewNet, setPreviewNet] = useState<Network>(initial.networks[0] ?? "instagram");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [hashTarget, setHashTarget] = useState<"caption" | "comment">("caption");

  const client = editorData.client;
  const accountNets = (client?.client_social_accounts ?? []).map((a) => a.network);
  const availableNets = accountNets.length ? NETWORKS.filter((n) => accountNets.includes(n) || networks.includes(n)) : NETWORKS;
  const activePreview = networks.includes(previewNet) ? previewNet : (networks[0] ?? previewNet);

  // Marca cambios sin guardar y avisa antes de salir
  const touch = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setDirty(true);
  };
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function changeClient(newId: string) {
    setClientId(newId);
    setMedia([]);
    setDirty(true);
    const data = await getClientEditorData(newId);
    setEditorData(data);
    const nets = (data.client?.client_social_accounts ?? []).map((a) => a.network);
    setNetworks(nets.length ? nets.filter((n) => NETWORK_INFO[n].formats.includes(format)) : ["instagram"]);
  }

  const rules = { format, networks, caption, overrides, media, scheduled_at: when ? fromInputValue(when) : null };
  const issues = checkPost(rules);

  function save(nextStatus: PostStatus = status) {
    const scheduled_at = when ? fromInputValue(when) : null;
    if (nextStatus !== status) {
      const err = canMoveTo(nextStatus, { ...rules, scheduled_at });
      if (err) return toast.error(err);
    }
    startSave(async () => {
      const res = await savePost(
        {
          id,
          client_id: clientId,
          title,
          format,
          caption,
          first_comment: firstComment,
          scheduled_at,
          status: nextStatus,
          networks,
          overrides: Object.fromEntries(networks.map((n) => [n, overrides[n] ?? null])),
          media_ids: media.map((m) => m.id),
        },
        isNew,
      );
      if (res.error) return void toast.error(res.error);
      setStatus(nextStatus);
      setDirty(false);
      toast.success(nextStatus !== status ? `Estado: ${STATUS_INFO[nextStatus].label}` : "Guardado");
      if (isNew) router.replace(`/publicaciones/${id}`);
      else router.refresh();
    });
  }

  function insertHashtags(tags: string[]) {
    const block = tags.join(" ");
    if (hashTarget === "caption") setCaption((c) => (c.trim() ? `${c.trimEnd()}\n\n${block}` : block));
    else setFirstComment((c) => (c.trim() ? `${c.trimEnd()} ${block}` : block));
    setDirty(true);
  }

  function applyTemplate(t: ClientEditorData["templates"][number]) {
    setFormat(t.format);
    setCaption(t.caption);
    setFirstComment(t.first_comment);
    if (t.networks.length) setNetworks(t.networks);
    setDirty(true);
    toast.success(`Plantilla «${t.name}» aplicada`);
  }

  function moveMedia(i: number, dir: -1 | 1) {
    setMedia((m) => {
      const n = [...m];
      const j = i + dir;
      if (j < 0 || j >= n.length) return m;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setDirty(true);
  }

  const account = (() => {
    const acc = client?.client_social_accounts.find((a) => a.network === activePreview);
    return {
      name: client?.name ?? "Cliente",
      handle: acc?.handle?.startsWith("@") ? acc.handle : `@${(acc?.handle ?? client?.name ?? "cliente").toLowerCase().replace(/\s+/g, "")}`,
      avatar: client?.logo_url ?? null,
      color: client?.color_primary ?? "#6366f1",
    };
  })();

  const next = NEXT_STEP[status];
  const statusOptions: PostStatus[] = status === "published" || status === "failed" ? [...STATUS_ORDER, "failed"] : STATUS_ORDER.filter((s) => s !== "published");

  return (
    <div className="mx-auto max-w-7xl">
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{isNew ? "Nueva publicación" : title || "Publicación sin título"}</h1>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={status} />
            {dirty && !readOnly && <span>· Cambios sin guardar</span>}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {!isNew && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Más opciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={async () => {
                      const r = await duplicatePost(id);
                      if (r.error) return toast.error(r.error);
                      toast.success("Copia creada como borrador");
                      router.push(`/publicaciones/${r.id}`);
                    }}
                  >
                    <Copy /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTemplateName(title || "Nueva plantilla")}>
                    <Bookmark /> Guardar como plantilla
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={async () => {
                      if (!confirm("¿Eliminar esta publicación? No se puede deshacer.")) return;
                      const r = await deletePost(id);
                      if (r.error) return toast.error(r.error);
                      setDirty(false);
                      toast.success("Publicación eliminada");
                      router.push("/calendario");
                    }}
                  >
                    <Trash2 /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" onClick={() => save()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar
            </Button>
            {next && (
              <Button onClick={() => save(next.to)} disabled={saving}>
                {next.label} <ArrowRight />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pestañas en el celular */}
      <div className="mb-4 grid grid-cols-2 rounded-lg bg-muted p-0.5 lg:hidden">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={cn("flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium text-muted-foreground", mobileTab === t && "bg-background text-foreground shadow-sm")}
          >
            {t === "edit" ? <Pencil className="size-4" /> : <Eye className="size-4" />}
            {t === "edit" ? "Editar" : "Vista previa"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Formulario ── */}
        <fieldset disabled={readOnly} className={cn("grid min-w-0 content-start gap-5", mobileTab === "preview" && "hidden lg:grid")}>
          <section className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="post-client">Cliente</Label>
                <NativeSelect id="post-client" value={clientId} onChange={(e) => changeClient(e.target.value)} disabled={!isNew}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="post-title">Título interno</Label>
                <Input id="post-title" value={title} onChange={(e) => touch(setTitle)(e.target.value)} placeholder="Ej. Promo de fin de semana" maxLength={200} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Formato</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Formato">
                {(Object.keys(FORMAT_INFO) as PostFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={format === f}
                    onClick={() => touch(setFormat)(f)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent",
                      format === f && "border-primary bg-primary/10 text-primary",
                    )}
                  >
                    {FORMAT_INFO[f].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Redes</Label>
              <div className="flex flex-wrap gap-1.5">
                {availableNets.map((n) => {
                  const on = networks.includes(n);
                  const locked = initial.published.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      disabled={locked}
                      title={locked ? "Ya publicada en esta red" : undefined}
                      onClick={() => {
                        touch(setNetworks)(on ? networks.filter((x) => x !== n) : [...networks, n]);
                        if (!on) setPreviewNet(n);
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm text-muted-foreground transition-colors hover:bg-accent",
                        on && "border-primary bg-primary/10 text-foreground",
                      )}
                    >
                      <NetworkBadge network={n} className={cn(!on && "opacity-40 grayscale")} />
                      {NETWORK_INFO[n].label}
                    </button>
                  );
                })}
              </div>
              {!accountNets.length && <p className="text-xs text-muted-foreground">Este cliente no tiene redes configuradas: se muestran todas.</p>}
            </div>
          </section>

          {/* Archivos */}
          <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Archivos <span className="text-sm font-normal text-muted-foreground">({media.length})</span>
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                <ImagePlus /> Agregar
              </Button>
            </div>
            {media.length === 0 ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-accent/50"
              >
                Elige imágenes o videos de la biblioteca del cliente, o sube nuevos.
              </button>
            ) : (
              <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Archivos de la publicación">
                {media.map((m, i) => (
                  <li key={m.id} className="relative w-28 shrink-0">
                    <MediaThumb url={m.url} kind={m.kind} duration={m.duration_s} className="aspect-square rounded-lg border" alt={m.filename} />
                    <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-black/60 text-[10px] font-semibold text-white">{i + 1}</span>
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          aria-label={`Quitar ${m.filename}`}
                          onClick={() => touch(setMedia)(media.filter((x) => x.id !== m.id))}
                          className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="size-3.5" />
                        </button>
                        {media.length > 1 && (
                          <div className="mt-1 flex justify-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="size-6" disabled={i === 0} onClick={() => moveMedia(i, -1)} aria-label="Mover a la izquierda">
                              <ArrowLeft className="size-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="size-6" disabled={i === media.length - 1} onClick={() => moveMedia(i, 1)} aria-label="Mover a la derecha">
                              <ArrowRight className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Texto */}
          <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="post-caption" className="text-base font-semibold">
                Texto
              </Label>
              <div className="flex gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <FileText /> Plantillas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Plantillas de {client?.name}</DropdownMenuLabel>
                    {editorData.templates.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">Aún no hay plantillas.</p>}
                    {editorData.templates.map((t) => (
                      <DropdownMenuItem key={t.id} onSelect={() => applyTemplate(t)}>
                        <span className="truncate">{t.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{FORMAT_INFO[t.format].label}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setTemplateName(title || "Nueva plantilla")}>
                      <Bookmark /> Guardar actual como plantilla
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Hash /> Hashtags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="grid w-72 gap-3 p-3">
                    <div className="grid grid-cols-2 rounded-md bg-muted p-0.5 text-xs">
                      {(["caption", "comment"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setHashTarget(t)}
                          className={cn("rounded py-1 text-muted-foreground", hashTarget === t && "bg-background text-foreground shadow-sm")}
                        >
                          {t === "caption" ? "En el texto" : "En 1er comentario"}
                        </button>
                      ))}
                    </div>
                    {editorData.hashtagGroups.length === 0 && <p className="text-sm text-muted-foreground">Este cliente no tiene grupos de hashtags.</p>}
                    {editorData.hashtagGroups.map((g) => (
                      <button key={g.id} type="button" onClick={() => insertHashtags(g.hashtags)} className="grid gap-0.5 rounded-md border p-2 text-left hover:bg-accent">
                        <span className="text-sm font-medium">{g.name}</span>
                        <span className="line-clamp-2 text-xs text-primary">{g.hashtags.join(" ")}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Textarea
              id="post-caption"
              rows={7}
              value={caption}
              onChange={(e) => touch(setCaption)(e.target.value)}
              placeholder="Escribe el texto de la publicación… usa #hashtags y @menciones"
              className="min-h-40"
            />
            <Counters networks={networks} caption={caption} overrides={overrides} />

            {networks.length > 1 && (
              <details className="group rounded-lg border px-3 py-2" open={networks.some((n) => overrides[n])}>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none">Personalizar el texto por red (opcional)</summary>
                <div className="mt-3 grid gap-3">
                  {networks.map((n) => (
                    <div key={n} className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`ov-${n}`} className="gap-1.5">
                          <NetworkBadge network={n} size="xs" /> {NETWORK_INFO[n].label}
                        </Label>
                        {overrides[n] != null && (
                          <button type="button" className="text-xs text-primary" onClick={() => touch(setOverrides)({ ...overrides, [n]: null })}>
                            Usar el texto general
                          </button>
                        )}
                      </div>
                      {overrides[n] == null ? (
                        <button
                          type="button"
                          onClick={() => touch(setOverrides)({ ...overrides, [n]: caption })}
                          className="rounded-md border border-dashed px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent/50"
                        >
                          Usa el texto general. Toca para escribir uno distinto para {NETWORK_INFO[n].label}.
                        </button>
                      ) : (
                        <Textarea id={`ov-${n}`} rows={3} value={overrides[n] ?? ""} onChange={(e) => touch(setOverrides)({ ...overrides, [n]: e.target.value })} />
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="post-comment">Primer comentario</Label>
              <Textarea
                id="post-comment"
                rows={2}
                value={firstComment}
                onChange={(e) => touch(setFirstComment)(e.target.value)}
                placeholder="Ideal para hashtags o un enlace. Se publica como comentario justo después."
              />
            </div>
          </section>

          {/* Fecha y estado */}
          <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 sm:p-5">
            <div className="grid gap-1.5">
              <Label htmlFor="post-when">
                <CalendarClock className="size-4" /> Fecha y hora de publicación
              </Label>
              <Input id="post-when" type="datetime-local" value={when} onChange={(e) => touch(setWhen)(e.target.value)} />
              <p className="text-xs text-muted-foreground">Hora de Colombia y de tu agencia.</p>
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="post-status">Estado</Label>
              <NativeSelect
                id="post-status"
                value={status}
                onChange={(e) => {
                  const s = e.target.value as PostStatus;
                  if (isNew) setStatus(s);
                  else save(s);
                }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_INFO[s].label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </section>

          {issues.length > 0 && (
            <section className="grid gap-1.5 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm" aria-label="Revisión">
              {issues.map((i, k) => (
                <p key={k} className={cn("flex items-start gap-2", i.level === "error" ? "text-destructive" : "text-foreground/80")}>
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {i.message}
                </p>
              ))}
            </section>
          )}
        </fieldset>

        {/* ── Vista previa ── */}
        <aside aria-label="Vista previa" className={cn("grid content-start gap-3 lg:sticky lg:top-6 lg:self-start", mobileTab === "edit" && "hidden lg:grid")}>
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-0.5" role="tablist" aria-label="Vista previa por red">
            {(networks.length ? networks : availableNets).map((n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={activePreview === n}
                onClick={() => setPreviewNet(n)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground",
                  activePreview === n && "bg-background text-foreground shadow-sm",
                )}
              >
                <NetworkBadge network={n} size="xs" />
                {NETWORK_INFO[n].label}
              </button>
            ))}
          </div>
          <PostPreview
            network={activePreview}
            format={format}
            caption={overrides[activePreview] ?? caption}
            firstComment={firstComment}
            media={media}
            account={account}
          />
          <p className="text-center text-xs text-muted-foreground">Vista aproximada. Cada red puede recortar o mostrar distinto.</p>
        </aside>
      </div>

      {pickerOpen && (
        <MediaPicker
          clientId={clientId}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          selectedIds={media.map((m) => m.id)}
          onConfirm={(items) => {
            const existing = new Set(media.map((m) => m.id));
            touch(setMedia)([...media, ...items.filter((i) => !existing.has(i.id))]);
          }}
        />
      )}

      <Dialog open={templateName !== null} onOpenChange={(o) => !o && setTemplateName(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guardar como plantilla</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await saveTemplate({ client_id: clientId, name: templateName ?? "", format, caption, first_comment: firstComment, networks });
              if (r.error) return toast.error(r.error);
              toast.success("Plantilla guardada");
              setEditorData((d) => ({
                ...d,
                templates: [...d.templates, { id: r.id!, name: templateName!, format, caption, first_comment: firstComment, networks }],
              }));
              setTemplateName(null);
            }}
          >
            <Input autoFocus aria-label="Nombre de la plantilla" value={templateName ?? ""} onChange={(e) => setTemplateName(e.target.value)} />
            <p className="text-xs text-muted-foreground">Guarda el formato, el texto, el primer comentario y las redes (sin archivos).</p>
            <DialogFooter>
              <Button type="submit">Guardar plantilla</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!readOnly && !isNew && status === "scheduled" && (
        <div className="mt-6 flex justify-end">
          <ConfirmButton
            trigger={
              <Button variant="ghost" size="sm">
                Quitar de la programación
              </Button>
            }
            destructive={false}
            title="¿Desprogramar?"
            description="Volverá al estado Aprobado y no se publicará ni se enviará recordatorio."
            confirmLabel="Desprogramar"
            onConfirm={() => {
              save("approved");
            }}
          />
        </div>
      )}
    </div>
  );
}

function Counters({ networks, caption, overrides }: { networks: Network[]; caption: string; overrides: Partial<Record<Network, string | null>> }) {
  if (!networks.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Contador de caracteres">
      {networks.map((n) => {
        const text = overrides[n] ?? caption;
        const used = charCount(text, n);
        const max = NETWORK_INFO[n].maxChars;
        const tags = countHashtags(text);
        const maxTags = NETWORK_INFO[n].maxHashtags;
        const over = used > max || (maxTags != null && tags > maxTags);
        const near = !over && used > max * 0.9;
        return (
          <span
            key={n}
            data-testid={`counter-${n}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs tabular-nums text-muted-foreground",
              near && "border-warning text-foreground",
              over && "border-destructive bg-destructive/10 text-destructive",
            )}
          >
            <NetworkBadge network={n} size="xs" />
            {used.toLocaleString("es-CO")}/{max.toLocaleString("es-CO")}
            {maxTags != null && (
              <span className={cn(tags > maxTags && "font-semibold")}>
                · {tags}/{maxTags} #
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

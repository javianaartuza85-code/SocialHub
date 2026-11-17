"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CheckSquare,
  Download,
  Folder,
  FolderInput,
  FolderPlus,
  Images,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MediaThumb } from "@/components/media-thumb";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmt } from "@/lib/dates";
import { ACCEPTED, formatBytes, formatDuration, MAX_UPLOAD_MB, normalizeTag, uploadAsset, validateFile } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type MediaAsset = {
  id: string;
  storage_path: string;
  kind: "image" | "video";
  mime: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  filename: string;
  tags: string[];
  folder_id: string | null;
  created_at: string;
  url: string;
};

type FolderItem = { id: string; name: string; count: number };
type UploadItem = { name: string; status: "uploading" | "done" | "error"; error?: string };

export function MediaLibrary(props: {
  clients: { id: string; name: string }[];
  clientId: string;
  userId: string;
  editable: boolean;
  folders: FolderItem[];
  total: number;
  unfiledCount: number;
  tags: string[];
  filters: { carpeta: string; etiqueta: string; tipo: string; q: string };
  assets: MediaAsset[];
}) {
  const { clients, clientId, userId, editable, folders, tags, filters, assets } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<MediaAsset | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ id?: string; name: string } | null>(null);
  const [, startNav] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const selecting = selected.size > 0;

  // Guarda la última dirección pedida para que dos filtros seguidos no se pisen.
  const pendingQuery = useRef<string | null>(null);
  useEffect(() => {
    pendingQuery.current = null;
  }, [searchParams]);

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(pendingQuery.current ?? searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      pendingQuery.current = p.toString();
      startNav(() => router.push(`${pathname}?${p.toString()}`));
    },
    [pathname, router, searchParams],
  );

  async function handleFiles(list: FileList | File[]) {
    if (!editable) return;
    const files = [...list];
    const valid: File[] = [];
    for (const f of files) {
      const err = validateFile(f);
      if (err) toast.error(err);
      else valid.push(f);
    }
    if (!valid.length) return;
    const supabase = createClient();
    const folderId = filters.carpeta && filters.carpeta !== "sin" ? filters.carpeta : null;
    setUploads((u) => [...u, ...valid.map((f) => ({ name: f.name, status: "uploading" as const }))]);
    // Sube de 3 en 3 para no saturar la conexión del celular
    const queue = [...valid];
    const worker = async () => {
      while (queue.length) {
        const file = queue.shift()!;
        try {
          await uploadAsset(supabase, { clientId, file, folderId, userId, tags: filters.etiqueta ? [filters.etiqueta] : [] });
          setUploads((u) => u.map((x) => (x.name === file.name && x.status === "uploading" ? { ...x, status: "done" } : x)));
        } catch (e) {
          setUploads((u) =>
            u.map((x) => (x.name === file.name && x.status === "uploading" ? { ...x, status: "error", error: (e as Error).message } : x)),
          );
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    router.refresh();
    setTimeout(() => setUploads((u) => u.filter((x) => x.status === "error")), 2500);
  }

  async function saveFolder() {
    if (!folderDialog?.name.trim()) return;
    const supabase = createClient();
    const { error } = folderDialog.id
      ? await supabase.from("media_folders").update({ name: folderDialog.name.trim() }).eq("id", folderDialog.id)
      : await supabase.from("media_folders").insert({ client_id: clientId, name: folderDialog.name.trim() });
    if (error) return toast.error(error.message);
    setFolderDialog(null);
    router.refresh();
  }

  async function deleteFolder(id: string) {
    const supabase = createClient();
    // Los archivos de la carpeta no se borran: quedan "sin carpeta".
    const { error } = await supabase.from("media_folders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Carpeta eliminada. Sus archivos quedaron en «Sin carpeta».");
    if (filters.carpeta === id) setParam({ carpeta: null });
    else router.refresh();
  }

  async function bulkUpdate(patch: { folder_id?: string | null; addTag?: string }) {
    const supabase = createClient();
    const ids = [...selected];
    if (patch.addTag !== undefined) {
      const tag = normalizeTag(patch.addTag);
      if (!tag) return;
      await Promise.all(
        assets
          .filter((a) => selected.has(a.id))
          .map((a) => supabase.from("media_assets").update({ tags: [...new Set([...a.tags, tag])] }).eq("id", a.id)),
      );
    } else {
      const { error } = await supabase.from("media_assets").update({ folder_id: patch.folder_id ?? null }).in("id", ids);
      if (error) return toast.error(error.message);
    }
    toast.success("Listo");
    setSelected(new Set());
    router.refresh();
  }

  async function deleteAssets(list: MediaAsset[]): Promise<void> {
    const supabase = createClient();
    const { data: used } = await supabase.from("post_media").select("media_id").in("media_id", list.map((a) => a.id));
    const { error } = await supabase.from("media_assets").delete().in("id", list.map((a) => a.id));
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from("media").remove(list.map((a) => a.storage_path));
    toast.success(
      used?.length
        ? `${list.length} archivo(s) eliminados. Se quitaron también de ${used.length} publicación(es).`
        : `${list.length} archivo(s) eliminados`,
    );
    setSelected(new Set());
    setDetail(null);
    router.refresh();
  }

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? "Sin carpeta";
  const pending = uploads.filter((u) => u.status === "uploading").length;

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      {/* ── Columna izquierda: cliente y carpetas ── */}
      <aside className="grid content-start gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="media-client">Cliente</Label>
          <NativeSelect id="media-client" value={clientId} onChange={(e) => startNav(() => router.push(`${pathname}?cliente=${e.target.value}`))}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <nav aria-label="Carpetas" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:px-0">
          <FolderButton active={!filters.carpeta} onClick={() => setParam({ carpeta: null })} icon={<Images />} label="Todos" count={props.total} />
          {folders.map((f) => (
            <div key={f.id} className="group relative shrink-0">
              <FolderButton active={filters.carpeta === f.id} onClick={() => setParam({ carpeta: f.id })} icon={<Folder />} label={f.name} count={f.count} />
              {editable && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute top-1/2 right-1 hidden size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-background group-hover:grid data-[state=open]:grid"
                      aria-label={`Opciones de ${f.name}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setFolderDialog({ id: f.id, name: f.name })}>
                      <Pencil /> Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => deleteFolder(f.id)}>
                      <Trash2 /> Eliminar carpeta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          <FolderButton active={filters.carpeta === "sin"} onClick={() => setParam({ carpeta: "sin" })} icon={<Folder className="opacity-50" />} label="Sin carpeta" count={props.unfiledCount} />
          {editable && (
            <button
              onClick={() => setFolderDialog({ name: "" })}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-accent"
            >
              <FolderPlus className="size-4" /> Nueva carpeta
            </button>
          )}
        </nav>
      </aside>

      {/* ── Contenido ── */}
      <section
        className="relative min-w-0"
        onDragOver={(e) => {
          if (!editable || !e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <form
            className="relative min-w-40 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ q: String(new FormData(e.currentTarget).get("q") ?? "") || null });
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={filters.q} placeholder="Buscar por nombre…" aria-label="Buscar archivo" className="pl-9" />
          </form>
          <NativeSelect aria-label="Tipo" className="w-32" value={filters.tipo} onChange={(e) => setParam({ tipo: e.target.value || null })}>
            <option value="">Todo</option>
            <option value="image">Imágenes</option>
            <option value="video">Videos</option>
          </NativeSelect>
          {editable && (
            <>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload /> Subir
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPTED}
                hidden
                data-testid="media-upload"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>

        {tags.length > 0 && (
          <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setParam({ etiqueta: filters.etiqueta === t ? null : t })}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent",
                  filters.etiqueta === t && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                <Tag className="size-3" />
                {t}
              </button>
            ))}
          </div>
        )}

        {uploads.length > 0 && (
          <div className="mb-3 grid gap-1 rounded-lg border bg-card p-3 text-sm" aria-live="polite">
            <p className="mb-1 font-medium">{pending ? `Subiendo ${pending} archivo(s)…` : "Subida terminada"}</p>
            {uploads.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                {u.status === "uploading" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                {u.status === "done" && <Check className="size-3.5 text-success" />}
                {u.status === "error" && <X className="size-3.5 text-destructive" />}
                <span className="truncate">{u.error ?? u.name}</span>
              </div>
            ))}
            {!pending && uploads.some((u) => u.status === "error") && (
              <Button variant="ghost" size="sm" className="w-fit" onClick={() => setUploads([])}>
                Cerrar
              </Button>
            )}
          </div>
        )}

        {selecting && editable && (
          <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-sm lg:top-2">
            <span className="px-2 text-sm font-medium">{selected.size} seleccionado(s)</span>
            <NativeSelect
              aria-label="Mover a carpeta"
              className="w-44"
              value=""
              onChange={(e) => e.target.value && bulkUpdate({ folder_id: e.target.value === "sin" ? null : e.target.value })}
            >
              <option value="">Mover a…</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
              <option value="sin">Sin carpeta</option>
            </NativeSelect>
            <BulkTag onAdd={(t) => bulkUpdate({ addTag: t })} />
            <ConfirmButton
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 /> Eliminar
                </Button>
              }
              title={`¿Eliminar ${selected.size} archivo(s)?`}
              description="Se borrarán de la biblioteca y de las publicaciones donde se usen."
              confirmLabel="Eliminar"
              onConfirm={() => deleteAssets(assets.filter((a) => selected.has(a.id)))}
            />
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
              Cancelar
            </Button>
          </div>
        )}

        {assets.length === 0 ? (
          <EmptyState
            icon={<Images />}
            title={filters.q || filters.etiqueta || filters.tipo ? "No hay archivos con esos filtros" : "Aún no hay archivos aquí"}
            description={editable ? `Arrastra imágenes o videos aquí, o usa el botón Subir. Máximo ${MAX_UPLOAD_MB} MB por archivo.` : undefined}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {assets.map((a) => {
              const isSel = selected.has(a.id);
              return (
                <li key={a.id} className="group relative">
                  <button
                    type="button"
                    onClick={() =>
                      selecting
                        ? setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(a.id)) n.delete(a.id);
                            else n.add(a.id);
                            return n;
                          })
                        : setDetail(a)
                    }
                    className={cn(
                      "block w-full overflow-hidden rounded-lg border bg-card text-left ring-primary transition-shadow hover:shadow-md",
                      isSel && "ring-2",
                    )}
                    aria-label={a.filename}
                  >
                    <MediaThumb url={a.url} kind={a.kind} duration={a.duration_s} className="aspect-square" />
                    <span className="block truncate px-2 py-1.5 text-xs">{a.filename}</span>
                  </button>
                  {editable && (
                    <button
                      type="button"
                      aria-label={isSel ? "Quitar de la selección" : "Seleccionar"}
                      onClick={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (n.has(a.id)) n.delete(a.id);
                          else n.add(a.id);
                          return n;
                        })
                      }
                      className={cn(
                        "absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-md border border-white/60 bg-black/30 text-white backdrop-blur transition-opacity",
                        !isSel && !selecting && "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                        isSel && "border-primary bg-primary",
                      )}
                    >
                      {isSel ? <Check className="size-4" /> : <CheckSquare className="size-3.5 opacity-80" />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px]">
            <p className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 font-medium shadow">
              <Upload className="size-4" /> Suelta para subir
            </p>
          </div>
        )}
      </section>

      {/* ── Detalle del archivo ── */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="gap-0">
          {detail && (
            <AssetDetail
              key={detail.id}
              asset={detail}
              folders={folders}
              editable={editable}
              folderName={folderName(detail.folder_id)}
              onChanged={() => router.refresh()}
              onDelete={() => deleteAssets([detail])}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!folderDialog} onOpenChange={(o) => !o && setFolderDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{folderDialog?.id ? "Renombrar carpeta" : "Nueva carpeta"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveFolder();
            }}
            className="grid gap-4"
          >
            <Input
              autoFocus
              aria-label="Nombre de la carpeta"
              value={folderDialog?.name ?? ""}
              onChange={(e) => setFolderDialog((f) => (f ? { ...f, name: e.target.value } : f))}
              placeholder="Ej. Campaña Navidad"
              maxLength={60}
            />
            <DialogFooter>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap lg:w-full text-muted-foreground hover:bg-accent [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-accent font-medium text-accent-foreground",
      )}
    >
      {icon}
      <span className="truncate lg:flex-1">{label}</span>
      <span className="pr-6 text-xs tabular-nums opacity-70 lg:pr-5">{count}</span>
    </button>
  );
}

function BulkTag({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(v);
        setV("");
      }}
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="Agregar etiqueta" aria-label="Agregar etiqueta a la selección" className="h-8 w-36" />
      <Button type="submit" size="sm" variant="outline" disabled={!v.trim()}>
        <Tag />
      </Button>
    </form>
  );
}

function AssetDetail({
  asset,
  folders,
  editable,
  folderName,
  onChanged,
  onDelete,
}: {
  asset: MediaAsset;
  folders: FolderItem[];
  editable: boolean;
  folderName: string;
  onChanged: () => void;
  onDelete: () => Promise<void>;
}) {
  const [tags, setTags] = useState(asset.tags);
  const [newTag, setNewTag] = useState("");
  const [name, setName] = useState(asset.filename);

  async function update(patch: { tags?: string[]; folder_id?: string | null; filename?: string }) {
    const supabase = createClient();
    const { error } = await supabase.from("media_assets").update(patch).eq("id", asset.id);
    if (error) toast.error(error.message);
    else onChanged();
  }

  function addTag() {
    const t = normalizeTag(newTag);
    if (!t || tags.includes(t)) return setNewTag("");
    const next = [...tags, t];
    setTags(next);
    setNewTag("");
    update({ tags: next });
  }

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="truncate">{asset.filename}</SheetTitle>
        <SheetDescription>
          {asset.kind === "video" ? "Video" : "Imagen"} · {formatBytes(asset.size_bytes)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          {asset.duration_s ? ` · ${formatDuration(asset.duration_s)}` : ""}
        </SheetDescription>
      </SheetHeader>
      <div className="grid gap-5 p-4">
        <div className="overflow-hidden rounded-lg border bg-muted">
          {asset.kind === "image" ? (
            <img src={asset.url} alt={asset.filename} className="max-h-[50dvh] w-full object-contain" />
          ) : (
            <video src={asset.url} controls playsInline className="max-h-[50dvh] w-full" />
          )}
        </div>

        {editable ? (
          <div className="grid gap-1.5">
            <Label htmlFor="asset-name">Nombre</Label>
            <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== asset.filename && update({ filename: name.trim() })} />
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <Label htmlFor="asset-folder">
            <FolderInput className="size-4" /> Carpeta
          </Label>
          {editable ? (
            <NativeSelect id="asset-folder" defaultValue={asset.folder_id ?? ""} onChange={(e) => update({ folder_id: e.target.value || null })}>
              <option value="">Sin carpeta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <p className="text-sm">{folderName}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>
            <Tag className="size-4" /> Etiquetas
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.length === 0 && <span className="text-sm text-muted-foreground">Sin etiquetas</span>}
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                {t}
                {editable && (
                  <button
                    aria-label={`Quitar etiqueta ${t}`}
                    onClick={() => {
                      const next = tags.filter((x) => x !== t);
                      setTags(next);
                      update({ tags: next });
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {editable && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addTag();
              }}
            >
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Nueva etiqueta" aria-label="Nueva etiqueta" />
              <Button type="submit" variant="outline" disabled={!newTag.trim()}>
                Agregar
              </Button>
            </form>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Subido el {fmt(asset.created_at, "d 'de' MMMM yyyy, HH:mm")}</p>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button asChild variant="outline">
            <a href={`${asset.url}&download=${encodeURIComponent(asset.filename)}`}>
              <Download /> Descargar
            </a>
          </Button>
          {editable && (
            <ConfirmButton
              trigger={
                <Button variant="ghost" className="text-destructive">
                  <Trash2 /> Eliminar
                </Button>
              }
              title="¿Eliminar este archivo?"
              description="Se quitará también de las publicaciones donde se use."
              confirmLabel="Eliminar"
              onConfirm={onDelete}
            />
          )}
        </div>
      </div>
    </>
  );
}

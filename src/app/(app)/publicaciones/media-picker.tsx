"use client";

import { Check, Loader2, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MediaThumb } from "@/components/media-thumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ACCEPTED, uploadAsset, validateFile } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { listClientMedia, type PickerMedia } from "./actions";

export type EditorMedia = {
  id: string;
  url: string;
  kind: "image" | "video";
  filename: string;
  duration_s: number | null;
  width: number | null;
  height: number | null;
};

export function MediaPicker({
  clientId,
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedIds: string[];
  onConfirm: (items: EditorMedia[]) => void;
}) {
  const [items, setItems] = useState<PickerMedia[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setItems(await listClientMedia(clientId));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!items) return [];
    return t ? items.filter((i) => i.filename.toLowerCase().includes(t) || i.tags.some((g) => g.includes(t))) : items;
  }, [items, q]);

  async function upload(files: FileList) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const ok = [...files].filter((f) => {
      const err = validateFile(f);
      if (err) toast.error(err);
      return !err;
    });
    setUploading(ok.length);
    const newIds: string[] = [];
    for (const file of ok) {
      try {
        newIds.push(await uploadAsset(supabase, { clientId, file, userId: user?.id }));
      } catch (e) {
        toast.error((e as Error).message);
      }
      setUploading((n) => n - 1);
    }
    await load();
    setChosen((c) => [...c, ...newIds]);
  }

  function toggle(id: string) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar archivos</DialogTitle>
          <DialogDescription>Toca para elegir. El orden en que los eliges es el orden del carrusel.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o etiqueta" className="pl-9" aria-label="Buscar en la biblioteca" />
          </div>
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
            {uploading > 0 ? <Loader2 className="animate-spin" /> : <Upload />} Subir
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPTED}
            hidden
            data-testid="picker-upload"
            onChange={(e) => {
              if (e.target.files?.length) upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <div className="-mx-1 min-h-48 flex-1 overflow-y-auto px-1">
          {items === null ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 animate-spin" /> Cargando biblioteca…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay archivos. Usa «Subir» para agregar.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((m) => {
                const already = selectedIds.includes(m.id);
                const n = chosen.indexOf(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => toggle(m.id)}
                      aria-pressed={n >= 0}
                      aria-label={m.filename}
                      className={cn("relative block w-full overflow-hidden rounded-lg border ring-primary disabled:opacity-40", n >= 0 && "ring-2")}
                    >
                      <MediaThumb url={m.url} kind={m.kind} duration={m.duration_s} className="aspect-square" />
                      {(n >= 0 || already) && (
                        <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {already ? <Check className="size-3" /> : n + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!chosen.length}
            onClick={() => {
              const byId = new Map((items ?? []).map((i) => [i.id, i]));
              onConfirm(
                chosen
                  .map((id) => byId.get(id))
                  .filter((x): x is PickerMedia => !!x)
                  .map(({ id, url, kind, filename, duration_s, width, height }) => ({ id, url, kind, filename, duration_s, width, height })),
              );
              onOpenChange(false);
            }}
          >
            Agregar {chosen.length > 0 && `(${chosen.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

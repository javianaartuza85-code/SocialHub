"use client";

import Link from "next/link";
import { Copy, FileText, Hash, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { NetworkBadge } from "@/components/network-badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FORMAT_INFO, NETWORK_INFO, NETWORKS, type Network, type PostFormat } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { deleteHashtagGroup, deleteTemplate, saveHashtagGroup, saveTemplateFull } from "./actions";

type Template = { id: string; name: string; format: PostFormat; caption: string; first_comment: string; networks: Network[] };
type Group = { id: string; name: string; hashtags: string[] };

export function ContentManager({ clientId, editable, templates, groups }: { clientId: string; editable: boolean; templates: Template[]; groups: Group[] }) {
  const router = useRouter();
  const [groupForm, setGroupForm] = useState<{ id?: string; name: string; hashtags: string } | null>(null);
  const [tplForm, setTplForm] = useState<(Omit<Template, "id"> & { id?: string }) | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Grupos de hashtags */}
      <section className="grid content-start gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Hash className="size-4" /> Grupos de hashtags
          </h2>
          {editable && (
            <Button size="sm" variant="outline" onClick={() => setGroupForm({ name: "", hashtags: "" })}>
              <Plus /> Nuevo grupo
            </Button>
          )}
        </div>
        {groups.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin grupos todavía.</p>}
        <ul className="grid gap-2">
          {groups.map((g) => (
            <li key={g.id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <p className="flex-1 font-medium">{g.name}</p>
                <span className="text-xs text-muted-foreground">{g.hashtags.length} hashtags</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={`Copiar ${g.name}`}
                  onClick={async () => {
                    await navigator.clipboard.writeText(g.hashtags.join(" "));
                    toast.success("Hashtags copiados");
                  }}
                >
                  <Copy />
                </Button>
                {editable && (
                  <>
                    <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${g.name}`} onClick={() => setGroupForm({ id: g.id, name: g.name, hashtags: g.hashtags.join(" ") })}>
                      <Pencil />
                    </Button>
                    <ConfirmButton
                      trigger={
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Eliminar ${g.name}`}>
                          <Trash2 />
                        </Button>
                      }
                      title={`¿Eliminar «${g.name}»?`}
                      confirmLabel="Eliminar"
                      onConfirm={async () => {
                        await deleteHashtagGroup(clientId, g.id);
                        router.refresh();
                      }}
                    />
                  </>
                )}
              </div>
              <p className="text-sm break-words text-primary">{g.hashtags.join(" ")}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Plantillas */}
      <section className="grid content-start gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileText className="size-4" /> Plantillas
          </h2>
          {editable && (
            <Button size="sm" variant="outline" onClick={() => setTplForm({ name: "", format: "post", caption: "", first_comment: "", networks: [] })}>
              <Plus /> Nueva plantilla
            </Button>
          )}
        </div>
        {templates.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sin plantillas. También puedes crearlas desde el editor con «Guardar como plantilla».
          </p>
        )}
        <ul className="grid gap-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <p className="flex-1 font-medium">{t.name}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{FORMAT_INFO[t.format].label}</span>
                {editable && (
                  <>
                    <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${t.name}`} onClick={() => setTplForm(t)}>
                      <Pencil />
                    </Button>
                    <ConfirmButton
                      trigger={
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Eliminar ${t.name}`}>
                          <Trash2 />
                        </Button>
                      }
                      title={`¿Eliminar «${t.name}»?`}
                      confirmLabel="Eliminar"
                      onConfirm={async () => {
                        await deleteTemplate(clientId, t.id);
                        router.refresh();
                      }}
                    />
                  </>
                )}
              </div>
              <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">{t.caption || "(sin texto)"}</p>
              <div className="mt-2 flex items-center gap-1">
                {t.networks.map((n) => (
                  <NetworkBadge key={n} network={n} size="xs" />
                ))}
                {editable && (
                  <Link href={`/publicaciones/nueva?cliente=${clientId}`} className="ml-auto text-xs text-primary hover:underline">
                    Crear publicación
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={!!groupForm} onOpenChange={(o) => !o && setGroupForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{groupForm?.id ? "Editar grupo" : "Nuevo grupo de hashtags"}</DialogTitle>
          </DialogHeader>
          {groupForm && (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await saveHashtagGroup(clientId, groupForm);
                  if (r.error) return void toast.error(r.error);
                  setGroupForm(null);
                  router.refresh();
                });
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="g-name">Nombre</Label>
                <Input id="g-name" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Ej. Marca" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="g-tags">Hashtags</Label>
                <Textarea id="g-tags" rows={4} value={groupForm.hashtags} onChange={(e) => setGroupForm({ ...groupForm, hashtags: e.target.value })} placeholder="#marca #ciudad #producto" />
                <p className="text-xs text-muted-foreground">Sepáralos con espacios o comas. El # se agrega solo.</p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tplForm} onOpenChange={(o) => !o && setTplForm(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{tplForm?.id ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
          </DialogHeader>
          {tplForm && (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await saveTemplateFull(clientId, tplForm);
                  if (r.error) return void toast.error(r.error);
                  setTplForm(null);
                  router.refresh();
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <div className="grid gap-1.5">
                  <Label htmlFor="t-name">Nombre</Label>
                  <Input id="t-name" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-format">Formato</Label>
                  <NativeSelect id="t-format" value={tplForm.format} onChange={(e) => setTplForm({ ...tplForm, format: e.target.value as PostFormat })}>
                    {(Object.keys(FORMAT_INFO) as PostFormat[]).map((f) => (
                      <option key={f} value={f}>
                        {FORMAT_INFO[f].label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NETWORKS.map((n) => {
                  const on = tplForm.networks.includes(n);
                  return (
                    <button
                      type="button"
                      key={n}
                      aria-pressed={on}
                      onClick={() => setTplForm({ ...tplForm, networks: on ? tplForm.networks.filter((x) => x !== n) : [...tplForm.networks, n] })}
                      className={cn("inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs", on ? "border-primary bg-primary/10" : "text-muted-foreground")}
                    >
                      <NetworkBadge network={n} size="xs" className={cn(!on && "opacity-40")} /> {NETWORK_INFO[n].label}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-caption">Texto</Label>
                <Textarea id="t-caption" rows={6} value={tplForm.caption} onChange={(e) => setTplForm({ ...tplForm, caption: e.target.value })} placeholder="Usa [corchetes] para marcar lo que hay que completar" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-comment">Primer comentario</Label>
                <Textarea id="t-comment" rows={2} value={tplForm.first_comment} onChange={(e) => setTplForm({ ...tplForm, first_comment: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

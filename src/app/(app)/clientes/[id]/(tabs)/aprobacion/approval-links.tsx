"use client";

import { Check, Copy, Link2, MessageCircle, Plus, ShieldCheck, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { createApprovalLink, revokeApprovalLink } from "./actions";

type LinkRow = { id: string; label: string; token_hint: string; expires_at: string | null; revoked_at: string | null; last_used_at: string | null; created_at: string };

export function ApprovalLinks({
  clientId,
  contactName,
  contactPhone,
  editable,
  links,
  pending,
}: {
  clientId: string;
  contactName: string;
  contactPhone: string;
  editable: boolean;
  links: LinkRow[];
  pending: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(contactName ? `Para ${contactName}` : "");
  const [days, setDays] = useState("90");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, start] = useTransition();

  const now = Date.now();
  const state = (l: LinkRow) => (l.revoked_at ? "revoked" : l.expires_at && new Date(l.expires_at).getTime() < now ? "expired" : "active");
  const phone = contactPhone.replace(/[^\d]/g, "");

  return (
    <div className="grid max-w-3xl gap-5">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ShieldCheck className="size-8 shrink-0 text-primary" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Tu cliente aprueba sin crear una cuenta</p>
            <p className="text-muted-foreground">
              Comparte un enlace privado. Verá las publicaciones <strong>En revisión</strong>, podrá aprobarlas o pedir cambios con un comentario. Ahora hay{" "}
              <strong>{pending}</strong> esperando.
            </p>
          </div>
          {editable && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Crear enlace
            </Button>
          )}
        </div>
      </div>

      <section className="grid gap-2">
        <h2 className="font-semibold">Enlaces</h2>
        {links.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aún no hay enlaces.</p>}
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {links.map((l) => {
            const s = state(l);
            return (
              <li key={l.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <Link2 className={cn("hidden size-4 sm:block", s === "active" ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {l.label} <span className="font-mono text-xs text-muted-foreground">…{l.token_hint}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Creado {fmt(l.created_at, "d MMM yyyy")}
                    {l.expires_at && ` · vence ${fmt(l.expires_at, "d MMM yyyy")}`}
                    {l.last_used_at ? ` · último uso ${fmt(l.last_used_at, "d MMM, HH:mm")}` : " · sin usar"}
                  </p>
                </div>
                <span
                  className={cn(
                    "w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                    s === "active" && "bg-success/15 text-success",
                    s !== "active" && "bg-muted text-muted-foreground",
                  )}
                >
                  {s === "active" ? "Activo" : s === "expired" ? "Vencido" : "Revocado"}
                </span>
                {editable && s === "active" && (
                  <ConfirmButton
                    trigger={
                      <Button variant="ghost" size="sm">
                        <ShieldOff /> Revocar
                      </Button>
                    }
                    title="¿Revocar este enlace?"
                    description="Dejará de funcionar de inmediato. Puedes crear otro cuando quieras."
                    confirmLabel="Revocar"
                    onConfirm={async () => {
                      const r = await revokeApprovalLink(clientId, l.id);
                      if (r.error) toast.error(r.error);
                      else toast.success("Enlace revocado");
                      router.refresh();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">Por seguridad, el enlace completo solo se muestra al crearlo. Si lo pierdes, revócalo y crea uno nuevo.</p>
      </section>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setCreated(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{created ? "Enlace listo" : "Nuevo enlace de aprobación"}</DialogTitle>
            {created && <DialogDescription>Cópialo ahora: por seguridad no se volverá a mostrar completo.</DialogDescription>}
          </DialogHeader>
          {created ? (
            <div className="grid gap-3">
              <Input readOnly value={created} aria-label="Enlace de aprobación" onFocus={(e) => e.target.select()} className="font-mono text-xs" />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(created);
                    setCopied(true);
                    toast.success("Enlace copiado");
                  }}
                >
                  {copied ? <Check /> : <Copy />} Copiar enlace
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(`¡Hola! Aquí puedes revisar y aprobar las próximas publicaciones: ${created}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle /> Enviar por WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await createApprovalLink(clientId, label, days ? Number(days) : null);
                  if (r.error) return void toast.error(r.error);
                  setCreated(r.url!);
                  setCopied(false);
                  router.refresh();
                });
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="link-label">Nombre del enlace</Label>
                <Input id="link-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Para Lucía (gerente)" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="link-days">Vence en</Label>
                <NativeSelect id="link-days" value={days} onChange={(e) => setDays(e.target.value)}>
                  <option value="7">7 días</option>
                  <option value="30">30 días</option>
                  <option value="90">90 días</option>
                  <option value="365">1 año</option>
                  <option value="">Nunca</option>
                </NativeSelect>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>
                  Crear enlace
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

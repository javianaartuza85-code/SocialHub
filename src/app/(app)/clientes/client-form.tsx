"use client";

import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClientAvatar } from "@/components/client-avatar";
import { NetworkBadge } from "@/components/network-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NETWORK_INFO, NETWORKS, type Network } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { saveClient, type ClientInput } from "./actions";

type Account = { network: Network; handle: string; profile_url: string | null; connection?: string };

export type ClientFormValues = {
  id?: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  accounts: Account[];
};

const EMPTY: ClientFormValues = {
  name: "",
  industry: "",
  logo_url: null,
  color_primary: "#6366f1",
  color_secondary: "#c7d2fe",
  color_accent: "#f59e0b",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  notes: "",
  accounts: [],
};

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} className="font-mono uppercase" />
      </div>
    </Field>
  );
}

export function ClientForm({ initial }: { initial?: ClientFormValues }) {
  const router = useRouter();
  const isNew = !initial?.id;
  const id = useMemo(() => initial?.id ?? crypto.randomUUID(), [initial?.id]);
  const [v, setV] = useState<ClientFormValues>(initial ?? EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url ?? null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ClientFormValues>(k: K, val: ClientFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  function toggleNetwork(n: Network, on: boolean) {
    setV((p) => ({
      ...p,
      accounts: on ? [...p.accounts, { network: n, handle: "", profile_url: null }] : p.accounts.filter((a) => a.network !== n),
    }));
  }
  function updateAccount(n: Network, patch: Partial<Account>) {
    setV((p) => ({ ...p, accounts: p.accounts.map((a) => (a.network === n ? { ...a, ...patch } : a)) }));
  }

  function onLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("El logo debe ser una imagen.");
    if (file.size > 5 * 1024 * 1024) return toast.error("El logo no puede pesar más de 5 MB.");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = v.accounts.find((a) => !a.handle.trim());
    if (missing) return toast.error(`Escribe el usuario de ${NETWORK_INFO[missing.network].label}.`);
    start(async () => {
      let logo_url = logoPreview && !logoFile ? logoPreview : null;
      if (logoFile) {
        const supabase = createClient();
        const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${id}/logo-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("logos").upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (error) return void toast.error("No se pudo subir el logo: " + error.message);
        logo_url = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
      }
      const res = await saveClient(
        {
          ...v,
          id,
          logo_url,
          accounts: v.accounts.map(({ network, handle, profile_url }) => ({ network, handle, profile_url: profile_url ?? "" })),
        } as ClientInput,
        isNew,
      );
      if (res.error) return void toast.error(res.error);
      toast.success(isNew ? "Cliente creado" : "Cambios guardados");
      router.push(`/clientes/${id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <section className="grid gap-5 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Identidad</h2>
        <div className="flex items-center gap-4">
          <ClientAvatar client={{ name: v.name || "?", logo_url: logoPreview, color_primary: v.color_primary }} className="size-16 text-xl" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus /> {logoPreview ? "Cambiar logo" : "Subir logo"}
            </Button>
            {logoPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLogoPreview(null);
                  setLogoFile(null);
                }}
              >
                <Trash2 /> Quitar
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del cliente *" htmlFor="name">
            <Input id="name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
          </Field>
          <Field label="Rubro" htmlFor="industry">
            <Input id="industry" value={v.industry ?? ""} onChange={(e) => set("industry", e.target.value)} placeholder="Ej. Cafetería" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorField label="Color principal" value={v.color_primary} onChange={(c) => set("color_primary", c)} />
          <ColorField label="Color secundario" value={v.color_secondary} onChange={(c) => set("color_secondary", c)} />
          <ColorField label="Color de acento" value={v.color_accent} onChange={(c) => set("color_accent", c)} />
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Persona de contacto" htmlFor="contact_name">
            <Input id="contact_name" value={v.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} />
          </Field>
          <Field label="Correo" htmlFor="contact_email">
            <Input id="contact_email" type="email" value={v.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} />
          </Field>
          <Field label="Teléfono / WhatsApp" htmlFor="contact_phone">
            <Input id="contact_phone" type="tel" value={v.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} />
          </Field>
          <Field label="Sitio web" htmlFor="website">
            <Input id="website" value={v.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">Redes sociales</h2>
          <p className="text-sm text-muted-foreground">Marca las redes que gestionas para este cliente.</p>
        </div>
        <div className="grid gap-3">
          {NETWORKS.map((n) => {
            const acc = v.accounts.find((a) => a.network === n);
            return (
              <div key={n} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[180px_1fr_1fr] sm:items-center">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={!!acc}
                    disabled={acc?.connection === "auto"}
                    onChange={(e) => toggleNetwork(n, e.target.checked)}
                  />
                  <NetworkBadge network={n} />
                  {NETWORK_INFO[n].label}
                </label>
                {acc && (
                  <>
                    <Input
                      aria-label={`Usuario en ${NETWORK_INFO[n].label}`}
                      placeholder="@usuario"
                      value={acc.handle}
                      onChange={(e) => updateAccount(n, { handle: e.target.value })}
                    />
                    <Input
                      aria-label={`Enlace al perfil de ${NETWORK_INFO[n].label}`}
                      placeholder="Enlace al perfil (opcional)"
                      value={acc.profile_url ?? ""}
                      onChange={(e) => updateAccount(n, { profile_url: e.target.value })}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <Field label="Notas internas" htmlFor="notes" hint="Tono de marca, palabras a evitar, horarios preferidos… Solo las ve tu equipo.">
          <Textarea id="notes" rows={4} value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </section>

      <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-xl border bg-background/90 p-3 backdrop-blur lg:bottom-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : isNew ? "Crear cliente" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

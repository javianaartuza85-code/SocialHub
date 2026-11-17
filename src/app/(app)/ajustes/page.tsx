import type { Metadata } from "next";
import { CheckCircle2, Clock, Globe, XCircle, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireMember } from "@/lib/auth";
import { ROLE_INFO } from "@/lib/constants";
import { fmt, TZ } from "@/lib/dates";
import { metaConfigured } from "@/lib/meta";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const user = await requireMember();
  const supabase = await createClient();
  const { data: cron } = await supabase.from("system_status").select("value, updated_at").eq("key", "cron").maybeSingle();
  const lastRun = cron?.updated_at ? new Date(cron.updated_at) : null;
  const cronHealthy = lastRun && Date.now() - lastRun.getTime() < 10 * 60_000;
  const meta = metaConfigured();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Ajustes" />

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Tu perfil</h2>
        <ProfileForm fullName={user.fullName} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {user.email} · {ROLE_INFO[user.role].label}
          </span>
          <ThemeToggle />
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock className="size-4" /> Recordatorios y publicación automática
        </h2>
        <p className="flex items-center gap-2">
          {cronHealthy ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
          {lastRun ? `Última revisión: ${fmt(lastRun, "d MMM, HH:mm:ss")}` : "La revisión automática aún no se ha ejecutado."}
        </p>
        {!cronHealthy && (
          <p className="text-muted-foreground">
            Cada minuto, Supabase debe llamar a <code className="rounded bg-muted px-1">{site}/api/cron/publicar</code> para enviar recordatorios y publicar. Sigue el paso
            «Activar la tarea automática» del README.
          </p>
        )}
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <Zap className="size-4" /> Conexión con Meta (Instagram y Facebook)
        </h2>
        <p className="flex items-center gap-2">
          {meta ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-muted-foreground" />}
          {meta ? "Configurada. Conecta cada cliente desde su ficha." : "No configurada: todas las redes usan el modo manual."}
        </p>
        {!meta && (
          <p className="text-muted-foreground">
            Para activarla, crea una app en Meta for Developers y agrega <code className="rounded bg-muted px-1">META_APP_ID</code> y{" "}
            <code className="rounded bg-muted px-1">META_APP_SECRET</code> en Vercel. El README lo explica paso a paso. La dirección de retorno que debes registrar en Meta es:{" "}
            <code className="rounded bg-muted px-1 break-all">{site}/api/meta/callback</code>
          </p>
        )}
      </section>

      <section className="grid gap-2 rounded-xl border bg-card p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <Globe className="size-4" /> Zona horaria
        </h2>
        <p className="text-muted-foreground">
          Todas las fechas se muestran y programan en <strong className="text-foreground">{TZ}</strong> (ahora son las {fmt(new Date(), "HH:mm")}). Se cambia con la
          variable <code className="rounded bg-muted px-1">NEXT_PUBLIC_TIMEZONE</code>.
        </p>
      </section>
    </div>
  );
}

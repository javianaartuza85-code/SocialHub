import Link from "next/link";
import type { Metadata } from "next";
import { Archive, Plus, Search, Users } from "lucide-react";
import { ClientAvatar } from "@/components/client-avatar";
import { NetworkBadge } from "@/components/network-badge";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canEdit, requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; archivados?: string }> }) {
  const { q = "", archivados } = await searchParams;
  const showArchived = archivados === "1";
  const user = await requireMember();
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, name, industry, logo_url, color_primary, archived_at, client_social_accounts(network)")
    .order("name");
  query = showArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_]/g, "")}%`);
  const { data: clients } = await query;

  // Próximas publicaciones por cliente (14 días)
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 864e5);
  const { data: upcoming } = await supabase
    .from("posts")
    .select("client_id")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in14.toISOString())
    .neq("status", "idea");
  const upcomingBy = new Map<string, number>();
  upcoming?.forEach((p) => upcomingBy.set(p.client_id, (upcomingBy.get(p.client_id) ?? 0) + 1));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Clientes"
        description={showArchived ? "Clientes archivados. Puedes restaurarlos cuando quieras." : "Las marcas que gestionas."}
        actions={
          canEdit(user.role) && (
            <Button asChild>
              <Link href="/clientes/nuevo">
                <Plus /> Nuevo cliente
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <form className="relative flex-1 sm:max-w-xs" action="/clientes">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          {showArchived && <input type="hidden" name="archivados" value="1" />}
          <Input name="q" defaultValue={q} placeholder="Buscar cliente…" className="pl-9" aria-label="Buscar cliente" />
        </form>
        <div className="inline-flex w-fit rounded-lg bg-muted p-0.5 text-sm">
          <Link href="/clientes" className={cn("rounded-md px-3 py-1.5 text-muted-foreground", !showArchived && "bg-background text-foreground shadow-sm")}>
            Activos
          </Link>
          <Link
            href="/clientes?archivados=1"
            className={cn("rounded-md px-3 py-1.5 text-muted-foreground", showArchived && "bg-background text-foreground shadow-sm")}
          >
            Archivados
          </Link>
        </div>
      </div>

      {!clients?.length ? (
        <EmptyState
          icon={showArchived ? <Archive /> : <Users />}
          title={q ? "No encontramos clientes con ese nombre" : showArchived ? "No hay clientes archivados" : "Aún no tienes clientes"}
          action={
            !q && !showArchived && canEdit(user.role) ? (
              <Button asChild>
                <Link href="/clientes/nuevo">
                  <Plus /> Crear el primero
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => {
            const n = upcomingBy.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/clientes/${c.id}`}
                  className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: c.color_primary }} />
                  <div className="flex items-center gap-3">
                    <ClientAvatar client={c} className="size-11" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold group-hover:text-primary">{c.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{c.industry || "Sin rubro"}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex gap-1">
                      {c.client_social_accounts.map((a) => (
                        <NetworkBadge key={a.network} network={a.network} />
                      ))}
                    </div>
                    {!showArchived && (
                      <span className={cn("text-xs", n === 0 ? "font-medium text-warning" : "text-muted-foreground")}>
                        {n === 0 ? "Sin contenido próximo" : `${n} próxima${n === 1 ? "" : "s"} en 14 días`}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

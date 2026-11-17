import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClientAvatar } from "@/components/client-avatar";
import { canEdit, requireMember } from "@/lib/auth";
import { getClient } from "@/lib/queries";
import { ClientActions } from "./client-actions";
import { ClientTabs } from "./client-tabs";

export default async function ClientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, client] = await Promise.all([requireMember(), getClient(id)]);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      <div className="relative mb-5 overflow-hidden rounded-2xl border bg-card p-5">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ background: `linear-gradient(120deg, ${client.color_primary}, ${client.color_accent})` }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ClientAvatar client={client} className="size-14 text-lg" />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                {client.name}
                {client.archived_at && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Archivado</span>}
              </h1>
              <p className="text-sm text-muted-foreground">{client.industry || "Sin rubro"}</p>
              <div className="mt-2 flex gap-1.5">
                {[client.color_primary, client.color_secondary, client.color_accent].map((c, i) => (
                  <span key={i} title={c} className="size-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          {canEdit(user.role) && <ClientActions id={client.id} archived={!!client.archived_at} isAdmin={user.role === "admin"} />}
        </div>
      </div>
      <ClientTabs id={client.id} />
      <div className="mt-5">{children}</div>
    </div>
  );
}

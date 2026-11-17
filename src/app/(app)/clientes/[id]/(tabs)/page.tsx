import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Globe, Mail, Phone, User } from "lucide-react";
import { NetworkBadge } from "@/components/network-badge";
import { POST_LIST_SELECT, PostList, type PostListItem } from "@/components/post-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NETWORK_INFO } from "@/lib/constants";
import { getClient } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ClientSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const supabase = await createClient();
  const { data: upcoming } = await supabase
    .from("posts")
    .select(POST_LIST_SELECT)
    .eq("client_id", id)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(5);

  const contact = [
    { icon: User, value: client.contact_name },
    { icon: Mail, value: client.contact_email, href: client.contact_email ? `mailto:${client.contact_email}` : undefined },
    { icon: Phone, value: client.contact_phone, href: client.contact_phone ? `tel:${client.contact_phone.replace(/\s/g, "")}` : undefined },
    { icon: Globe, value: client.website, href: client.website ?? undefined },
  ].filter((c) => c.value);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-5">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Próximas publicaciones</h2>
            <Link href={`/clientes/${id}/publicaciones`} className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <PostList
            posts={(upcoming ?? []) as PostListItem[]}
            empty={
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay nada programado. ¡Buen momento para planificar!
              </p>
            }
          />
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{client.notes || "Sin notas."}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5 text-sm">
            {contact.length === 0 && <p className="text-muted-foreground">Sin datos de contacto.</p>}
            {contact.map(({ icon: Icon, value, href }, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {href ? (
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="truncate hover:text-primary hover:underline">
                    {value}
                  </a>
                ) : (
                  <span className="truncate">{value}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Redes sociales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {client.client_social_accounts.length === 0 && <p className="text-sm text-muted-foreground">Sin redes configuradas.</p>}
            {client.client_social_accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <NetworkBadge network={a.network} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.handle}</p>
                  <p className="text-xs text-muted-foreground">
                    {NETWORK_INFO[a.network].label} · {a.connection === "auto" ? "Conectada (publicación automática)" : "Modo manual"}
                  </p>
                </div>
                {a.profile_url && (
                  <a href={a.profile_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Abrir perfil">
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

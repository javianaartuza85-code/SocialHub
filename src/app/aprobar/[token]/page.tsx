import type { Metadata } from "next";
import { LinkIcon } from "lucide-react";
import { ClientAvatar } from "@/components/client-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { signMediaUrls } from "@/lib/signed-urls";
import { resolveApprovalToken } from "./resolve";
import { PortalView, type PortalPost } from "./portal-view";

// El enlace es privado: que no lo indexen buscadores ni se filtre en el "Referer".
export const metadata: Metadata = {
  title: "Aprobación de contenido",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function ApprovalPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await resolveApprovalToken(token);

  if (!ctx) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <LinkIcon className="mx-auto mb-4 size-10 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-semibold">Este enlace no está disponible</h1>
          <p className="text-sm text-muted-foreground">Puede que haya vencido o que tu agencia lo haya desactivado. Pídeles un enlace nuevo.</p>
        </div>
      </main>
    );
  }

  const { admin, client, linkId } = ctx;
  await admin.from("approval_links").update({ last_used_at: new Date().toISOString() }).eq("id", linkId);

  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: pending }, { data: recent }, { data: accounts }] = await Promise.all([
    admin
      .from("posts")
      .select("id, title, status, format, caption, first_comment, scheduled_at, post_targets(network, caption_override), post_media(position, media_assets(id, storage_path, kind, width, height))")
      .eq("client_id", client.id)
      .eq("status", "in_review")
      .order("scheduled_at", { nullsFirst: false }),
    admin
      .from("posts")
      .select("id, title, status, format, caption, first_comment, scheduled_at, post_targets(network, caption_override), post_media(position, media_assets(id, storage_path, kind, width, height))")
      .eq("client_id", client.id)
      .in("status", ["approved", "scheduled", "published"])
      .gte("scheduled_at", since)
      .order("scheduled_at", { ascending: false })
      .limit(20),
    admin.from("client_social_accounts").select("network, handle").eq("client_id", client.id),
  ]);

  const all = [...(pending ?? []), ...(recent ?? [])];
  const ids = all.map((p) => p.id);
  const { data: comments } = ids.length
    ? await admin.from("post_comments").select("post_id, author_name, body, is_client, created_at").in("post_id", ids).eq("is_client", true).order("created_at")
    : { data: [] };
  const paths = all.flatMap((p) => p.post_media.map((m) => m.media_assets?.storage_path ?? ""));
  const urls = await signMediaUrls(admin, paths, 6 * 3600);

  const toPortal = (p: (typeof all)[number]): PortalPost => ({
    id: p.id,
    title: p.title,
    status: p.status,
    format: p.format,
    caption: p.caption,
    first_comment: p.first_comment,
    scheduled_at: p.scheduled_at,
    targets: p.post_targets,
    media: [...p.post_media]
      .sort((a, b) => a.position - b.position)
      .map((m) => m.media_assets)
      .filter((m) => !!m)
      .map((m) => ({ id: m.id, url: urls.get(m.storage_path) ?? "", kind: m.kind, width: m.width, height: m.height })),
    comments: (comments ?? []).filter((c) => c.post_id === p.id),
  });

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <ClientAvatar client={client} className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{client.name}</p>
            <p className="text-xs text-muted-foreground">Revisión de contenido</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${client.color_primary}, ${client.color_accent})` }} />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <PortalView
          token={token}
          clientName={client.name}
          defaultName={client.contact_name ?? ""}
          account={{
            name: client.name,
            avatar: client.logo_url,
            color: client.color_primary,
            handles: Object.fromEntries((accounts ?? []).map((a) => [a.network, a.handle])),
          }}
          pending={(pending ?? []).map(toPortal)}
          recent={(recent ?? []).map(toPortal)}
        />
      </main>
    </div>
  );
}

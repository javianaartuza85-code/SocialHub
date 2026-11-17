import Link from "next/link";
import { Images, Film, Clapperboard, Type } from "lucide-react";
import { ClientAvatar } from "@/components/client-avatar";
import { NetworkBadge } from "@/components/network-badge";
import { StatusBadge } from "@/components/status-badge";
import { FORMAT_INFO, type Network, type PostFormat, type PostStatus } from "@/lib/constants";
import { fmt } from "@/lib/dates";

export type PostListItem = {
  id: string;
  title: string;
  caption: string;
  status: PostStatus;
  format: PostFormat;
  scheduled_at: string | null;
  post_targets: { network: Network }[];
  clients?: { name: string; logo_url: string | null; color_primary: string } | null;
};

const FORMAT_ICON: Record<PostFormat, React.ComponentType<{ className?: string }>> = {
  post: Type,
  carousel: Images,
  video: Film,
  reel: Clapperboard,
};

export function PostList({ posts, showClient = false, empty }: { posts: PostListItem[]; showClient?: boolean; empty?: React.ReactNode }) {
  if (!posts.length) return <>{empty ?? <p className="py-6 text-center text-sm text-muted-foreground">No hay publicaciones.</p>}</>;
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {posts.map((p) => {
        const Icon = FORMAT_ICON[p.format];
        return (
          <li key={p.id}>
            <Link href={`/publicaciones/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
              {showClient && p.clients ? (
                <ClientAvatar client={p.clients} className="size-9" />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground" title={FORMAT_INFO[p.format].label}>
                  <Icon className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title || p.caption.slice(0, 60) || "Sin título"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {showClient && p.clients ? `${p.clients.name} · ` : ""}
                  {p.scheduled_at ? fmt(p.scheduled_at, "EEE d MMM, HH:mm") : "Sin fecha"}
                </p>
              </div>
              <div className="hidden gap-1 sm:flex">
                {p.post_targets.map((t) => (
                  <NetworkBadge key={t.network} network={t.network} size="xs" />
                ))}
              </div>
              <StatusBadge status={p.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export const POST_LIST_SELECT = "id, title, caption, status, format, scheduled_at, post_targets(network), clients(name, logo_url, color_primary)";

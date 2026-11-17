import Link from "next/link";
import { POST_LIST_SELECT, PostList, type PostListItem } from "@/components/post-list";
import { STATUS_INFO, STATUS_ORDER, type PostStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ClientPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const { id } = await params;
  const { estado } = await searchParams;
  const status = [...STATUS_ORDER, "failed"].includes(estado ?? "") ? (estado as PostStatus) : null;
  const supabase = await createClient();
  let q = supabase.from("posts").select(POST_LIST_SELECT).eq("client_id", id).order("scheduled_at", { ascending: false, nullsFirst: true });
  if (status) q = q.eq("status", status);
  const { data } = await q;

  return (
    <div className="grid gap-4">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip href={`/clientes/${id}/publicaciones`} active={!status}>
          Todas
        </Chip>
        {STATUS_ORDER.map((s) => (
          <Chip key={s} href={`/clientes/${id}/publicaciones?estado=${s}`} active={status === s}>
            {STATUS_INFO[s].label}
          </Chip>
        ))}
      </div>
      <PostList posts={(data ?? []) as PostListItem[]} />
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm whitespace-nowrap text-muted-foreground hover:bg-accent",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary",
      )}
    >
      {children}
    </Link>
  );
}

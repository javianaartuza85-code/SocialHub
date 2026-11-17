import Link from "next/link";
import { AlertCircle, BellRing, CalendarCheck2, CalendarRange, Clock, Plus } from "lucide-react";
import { ClientAvatar } from "@/components/client-avatar";
import { POST_LIST_SELECT, PostList, type PostListItem } from "@/components/post-list";
import { Button } from "@/components/ui/button";
import { canEdit, requireMember } from "@/lib/auth";
import { fmt, startOfZonedDay } from "@/lib/dates";
import { getActiveClients } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DemoLoader } from "./demo-loader";

type Post = PostListItem & { client_id: string };

export default async function HomePage() {
  const user = await requireMember();
  const editable = canEdit(user.role);
  const clients = await getActiveClients();
  const firstName = user.fullName.split(" ")[0];

  if (!clients.length) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hola, {firstName} 👋</h1>
        <p className="mb-6 text-sm text-muted-foreground">Empecemos.</p>
        {user.role === "admin" ? <DemoLoader /> : <p className="text-muted-foreground">Aún no hay clientes. Pide a un administrador que los cree.</p>}
      </div>
    );
  }

  const supabase = await createClient();
  const today = startOfZonedDay(0);
  const tomorrow = startOfZonedDay(1);
  const weekEnd = startOfZonedDay(7);
  const activeIds = clients.map((c) => c.id);

  const [{ data: week }, { data: review }, { data: dueRows }] = await Promise.all([
    supabase
      .from("posts")
      .select(`${POST_LIST_SELECT}, client_id`)
      .in("client_id", activeIds)
      .gte("scheduled_at", today.toISOString())
      .lt("scheduled_at", weekEnd.toISOString())
      .neq("status", "idea")
      .order("scheduled_at"),
    supabase.from("posts").select(`${POST_LIST_SELECT}, client_id`).in("client_id", activeIds).eq("status", "in_review").order("scheduled_at", { nullsFirst: false }),
    // Programadas cuya hora ya llegó y que siguen pendientes en alguna red (modo manual)
    supabase
      .from("posts")
      .select(`${POST_LIST_SELECT}, client_id, pending:post_targets!inner(status)`)
      .in("client_id", activeIds)
      .eq("status", "scheduled")
      .eq("pending.status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at"),
  ]);
  const duePosts = (dueRows ?? []) as unknown as Post[];
  const weekPosts = (week ?? []) as unknown as Post[];
  const todayPosts = weekPosts.filter((p) => new Date(p.scheduled_at!) < tomorrow);
  const restOfWeek = weekPosts.filter((p) => new Date(p.scheduled_at!) >= tomorrow);
  const reviewPosts = (review ?? []) as unknown as Post[];

  // Clientes sin contenido listo (borrador en adelante) en los próximos 7 días
  const covered = new Set(weekPosts.map((p) => p.client_id));
  const uncovered = clients.filter((c) => !covered.has(c.id));

  // Agrupar el resto de la semana por día
  const byDay = new Map<string, Post[]>();
  for (const p of restOfWeek) {
    const k = fmt(p.scheduled_at!, "yyyy-MM-dd");
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }

  const kpis = [
    { label: "Hoy", value: todayPosts.length, icon: Clock, href: "#hoy" },
    { label: "Próximos 7 días", value: weekPosts.length, icon: CalendarRange, href: "#semana" },
    { label: "Esperando aprobación", value: reviewPosts.length, icon: CalendarCheck2, href: "#aprobacion" },
    { label: "Clientes sin contenido", value: uncovered.length, icon: AlertCircle, href: "#sin-contenido", warn: uncovered.length > 0 },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hola, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{fmt(new Date(), "EEEE d 'de' MMMM")}</p>
        </div>
        {editable && (
          <Button asChild className="w-fit">
            <Link href="/publicaciones/nueva">
              <Plus /> Nueva publicación
            </Link>
          </Button>
        )}
      </div>

      {duePosts.length > 0 && (
        <section id="publicar-ahora" className="grid gap-3 rounded-2xl border border-warning bg-warning/5 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <BellRing className="size-5 text-warning" /> Para publicar ahora ({duePosts.length})
          </h2>
          <p className="-mt-2 text-sm text-muted-foreground">Ya llegó su hora. Ábrelas para copiar el texto, descargar los archivos y marcarlas como publicadas.</p>
          <PostList posts={duePosts} showClient />
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <a key={k.label} href={k.href} className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
            <k.icon className={cn("mb-3 size-5 text-muted-foreground", k.warn && "text-warning")} />
            <p className="text-3xl font-semibold tabular-nums">{k.value}</p>
            <p className="text-sm text-muted-foreground">{k.label}</p>
          </a>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-8">
          <section id="hoy" className="grid gap-3">
            <SectionTitle title="Hoy" count={todayPosts.length} />
            <PostList
              posts={todayPosts}
              showClient
              empty={<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nada programado para hoy.</p>}
            />
          </section>

          <section id="semana" className="grid gap-3">
            <SectionTitle title="Resto de la semana" count={restOfWeek.length} href="/calendario?vista=timeGridWeek" />
            {byDay.size === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin publicaciones el resto de la semana.</p>}
            {[...byDay.entries()].map(([day, posts]) => (
              <div key={day} className="grid gap-2">
                <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{fmt(posts[0].scheduled_at!, "EEEE d 'de' MMMM")}</p>
                <PostList posts={posts} showClient />
              </div>
            ))}
          </section>
        </div>

        <div className="grid content-start gap-8">
          <section id="aprobacion" className="grid gap-3">
            <SectionTitle title="Pendientes de aprobación" count={reviewPosts.length} href="/calendario?estado=in_review&vista=listMonth" />
            <PostList
              posts={reviewPosts.slice(0, 8)}
              showClient
              empty={<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nada esperando aprobación. 🎉</p>}
            />
          </section>

          <section id="sin-contenido" className="grid gap-3">
            <SectionTitle title="Sin contenido próximo" count={uncovered.length} />
            {uncovered.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todos tus clientes tienen contenido esta semana.</p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {uncovered.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <ClientAvatar client={c} className="size-8" />
                    <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                    {editable && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/publicaciones/nueva?cliente=${c.id}`}>
                          <Plus /> Crear
                        </Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Clientes activos sin publicaciones (en borrador o más avanzadas) en los próximos 7 días.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, count, href }: { title: string; count: number; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold">
        {title} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
      </h2>
      {href && (
        <Link href={href} className="text-sm text-primary hover:underline">
          Ver en calendario
        </Link>
      )}
    </div>
  );
}

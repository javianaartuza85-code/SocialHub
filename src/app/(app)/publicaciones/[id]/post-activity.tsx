"use client";

import { MessageSquare, History, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_INFO, type PostStatus } from "@/lib/constants";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { addComment } from "../actions";

type Comment = { id: string; author_name: string; body: string; is_client: boolean; created_at: string };
type HistoryRow = {
  id: number;
  from_status: PostStatus | null;
  to_status: PostStatus;
  actor_label: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export function PostActivity({
  postId,
  canComment,
  comments,
  history,
}: {
  postId: string;
  canComment: boolean;
  comments: Comment[];
  history: HistoryRow[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section className="grid content-start gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <MessageSquare className="size-4" /> Comentarios ({comments.length})
        </h2>
        <ul className="grid gap-2">
          {comments.length === 0 && <li className="text-sm text-muted-foreground">Sin comentarios todavía.</li>}
          {comments.map((c) => (
            <li key={c.id} className={cn("rounded-xl border bg-card p-3", c.is_client && "border-primary/40 bg-primary/5")}>
              <p className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{c.author_name}</span>
                {c.is_client && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">Cliente</span>}
                <span className="text-xs text-muted-foreground">{fmt(c.created_at, "d MMM, HH:mm")}</span>
              </p>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
        {canComment && (
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await addComment(postId, body);
                if (r.error) return void toast.error(r.error);
                setBody("");
                router.refresh();
              });
            }}
          >
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Escribe una nota para el equipo…" aria-label="Nuevo comentario" />
            <Button type="submit" size="sm" className="w-fit" disabled={pending || !body.trim()}>
              <Send /> Comentar
            </Button>
          </form>
        )}
      </section>

      <section className="grid content-start gap-5">
        <div className="grid gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <History className="size-4" /> Historial
          </h2>
          <ol className="grid gap-2 border-l pl-4 text-sm">
            {history.length === 0 && <li className="text-muted-foreground">Sin cambios registrados.</li>}
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className={cn("absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-background", STATUS_INFO[h.to_status].dot)} />
                <p>
                  {h.from_status ? (
                    <>
                      {STATUS_INFO[h.from_status].label} → <strong>{STATUS_INFO[h.to_status].label}</strong>
                    </>
                  ) : (
                    <>
                      Creada como <strong>{STATUS_INFO[h.to_status].label}</strong>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {h.profiles?.full_name ?? h.actor_label ?? "Sistema"} · {fmt(h.created_at, "d MMM, HH:mm")}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

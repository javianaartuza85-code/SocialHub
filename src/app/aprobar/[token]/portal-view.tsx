"use client";

import { CalendarClock, Check, MessageSquare, PartyPopper, Pencil, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { NetworkBadge } from "@/components/network-badge";
import { PostPreview, type PreviewMedia } from "@/components/previews/post-preview";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FORMAT_INFO, NETWORK_INFO, type Network, type PostFormat, type PostStatus } from "@/lib/constants";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { clientAction } from "./actions";

export type PortalPost = {
  id: string;
  title: string;
  status: PostStatus;
  format: PostFormat;
  caption: string;
  first_comment: string;
  scheduled_at: string | null;
  targets: { network: Network; caption_override: string | null }[];
  media: PreviewMedia[];
  comments: { author_name: string; body: string; created_at: string }[];
};

type Account = { name: string; avatar: string | null; color: string; handles: Record<string, string> };

const NAME_KEY = "socialhub-portal-name";

export function PortalView({
  token,
  clientName,
  defaultName,
  account,
  pending,
  recent,
}: {
  token: string;
  clientName: string;
  defaultName: string;
  account: Account;
  pending: PortalPost[];
  recent: PortalPost[];
}) {
  const [name, setName] = useState(defaultName);
  const [tab, setTab] = useState<"pending" | "recent">("pending");

  // Recuerda el nombre en este navegador
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {}
  }, []);
  function saveName(v: string) {
    setName(v);
    try {
      localStorage.setItem(NAME_KEY, v);
    } catch {}
  }

  const list = tab === "pending" ? pending : recent;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hola{name ? `, ${name.split(" ")[0]}` : ""} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pending.length
              ? `Tienes ${pending.length} publicación${pending.length === 1 ? "" : "es"} esperando tu revisión.`
              : "No tienes publicaciones pendientes de revisión."}
          </p>
        </div>
        <div className="grid gap-1.5 sm:w-64">
          <Label htmlFor="portal-name">Tu nombre</Label>
          <Input id="portal-name" value={name} onChange={(e) => saveName(e.target.value)} placeholder="Para que la agencia sepa quién aprobó" />
        </div>
      </div>

      <div className="inline-flex w-fit rounded-lg bg-muted p-0.5 text-sm" role="tablist">
        <button role="tab" aria-selected={tab === "pending"} onClick={() => setTab("pending")} className={cn("rounded-md px-3 py-1.5 text-muted-foreground", tab === "pending" && "bg-background text-foreground shadow-sm")}>
          Por revisar ({pending.length})
        </button>
        <button role="tab" aria-selected={tab === "recent"} onClick={() => setTab("recent")} className={cn("rounded-md px-3 py-1.5 text-muted-foreground", tab === "recent" && "bg-background text-foreground shadow-sm")}>
          Aprobadas y publicadas ({recent.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <PartyPopper className="mx-auto mb-3 size-8 text-primary" />
          <p className="font-medium">{tab === "pending" ? "¡Todo al día!" : "Aún no hay publicaciones aprobadas recientes."}</p>
          {tab === "pending" && <p className="text-sm text-muted-foreground">Te avisaremos cuando {clientName} tenga contenido nuevo para revisar.</p>}
        </div>
      ) : (
        <ul className="grid gap-6">
          {list.map((p) => (
            <PortalPostCard key={p.id} post={p} token={token} name={name} account={account} />
          ))}
        </ul>
      )}

      <p className="pb-6 text-center text-xs text-muted-foreground">Este es un enlace privado. No lo compartas fuera de tu equipo.</p>
    </div>
  );
}

function PortalPostCard({ post, token, name, account }: { post: PortalPost; token: string; name: string; account: Account }) {
  const router = useRouter();
  const nets = post.targets.map((t) => t.network);
  const [net, setNet] = useState<Network>(nets[0] ?? "instagram");
  const [mode, setMode] = useState<null | "changes" | "comment">(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const canAct = post.status === "in_review";
  const caption = post.targets.find((t) => t.network === net)?.caption_override ?? post.caption;
  const handle = account.handles[net] ?? `@${account.name.toLowerCase().replace(/\s+/g, "")}`;

  function act(kind: "approve" | "changes" | "comment") {
    start(async () => {
      const r = await clientAction(token, post.id, kind, name, text);
      if (r.error) return void toast.error(r.error);
      toast.success(kind === "approve" ? "¡Aprobada! Gracias 🙌" : kind === "changes" ? "Enviamos tus cambios a la agencia" : "Comentario enviado");
      setText("");
      setMode(null);
      router.refresh();
    });
  }

  return (
    <li className="grid overflow-hidden rounded-2xl border bg-card md:grid-cols-[minmax(0,1fr)_380px]" aria-label={post.title || "Publicación"}>
      <div className="grid content-start gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} />
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{FORMAT_INFO[post.format].label}</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{post.title || "Publicación"}</h2>
          {post.scheduled_at && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground first-letter:uppercase">
              <CalendarClock className="size-4" /> {fmt(post.scheduled_at, "EEEE d 'de' MMMM, HH:mm")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {nets.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNet(n)}
              aria-pressed={net === n}
              className={cn("inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs", net === n ? "border-primary bg-primary/10" : "text-muted-foreground")}
            >
              <NetworkBadge network={n} size="xs" /> {NETWORK_INFO[n].label}
            </button>
          ))}
        </div>

        {post.comments.length > 0 && (
          <div className="grid gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <MessageSquare className="size-4" /> Tus comentarios
            </p>
            {post.comments.map((c, i) => (
              <div key={i} className="rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  {c.author_name} · {fmt(c.created_at, "d MMM, HH:mm")}
                </p>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        )}

        {mode && (
          <div className="grid gap-2">
            <Label htmlFor={`txt-${post.id}`}>{mode === "changes" ? "¿Qué te gustaría cambiar?" : "Tu comentario"}</Label>
            <Textarea id={`txt-${post.id}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <Button size="sm" disabled={pending || !text.trim()} onClick={() => act(mode)}>
                <Send /> Enviar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {!mode && (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {canAct && (
              <>
                <Button onClick={() => act("approve")} disabled={pending} className="bg-success text-white hover:bg-success/90">
                  <Check /> Aprobar
                </Button>
                <Button variant="outline" onClick={() => setMode("changes")} disabled={pending}>
                  <Pencil /> Pedir cambios
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setMode("comment")} disabled={pending}>
              <MessageSquare /> Comentar
            </Button>
          </div>
        )}
      </div>
      <div className="order-first border-b bg-muted/40 p-4 md:order-none md:border-b-0 md:border-l">
        <PostPreview
          network={net}
          format={post.format}
          caption={caption}
          firstComment={post.first_comment}
          media={post.media}
          account={{ name: account.name, handle: handle.startsWith("@") ? handle : `@${handle}`, avatar: account.avatar, color: account.color }}
        />
      </div>
    </li>
  );
}

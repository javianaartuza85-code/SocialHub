"use client";

import { Check, Copy, Download, ExternalLink, RotateCcw, Send, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { NetworkBadge } from "@/components/network-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NETWORK_INFO, type Network, type PostStatus } from "@/lib/constants";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { markTargetPending, markTargetPublished } from "../actions";

type Target = {
  network: Network;
  status: "pending" | "published" | "failed";
  publish_mode: "auto" | "manual";
  caption_override: string | null;
  permalink: string | null;
  published_at: string | null;
  error: string | null;
};

export function PublishPanel({
  postId,
  status,
  scheduledAt,
  caption,
  firstComment,
  targets,
  files,
  profiles,
  editable,
  metaEnabled,
}: {
  postId: string;
  status: PostStatus;
  scheduledAt: string | null;
  caption: string;
  firstComment: string;
  targets: Target[];
  files: { url: string; filename: string }[];
  profiles: Partial<Record<Network, string | null>>;
  editable: boolean;
  metaEnabled: boolean;
}) {
  if (!["approved", "scheduled", "published", "failed"].includes(status) || !targets.length) return null;
  const due = scheduledAt && new Date(scheduledAt).getTime() <= Date.now();
  const pendingManual = targets.filter((t) => t.status === "pending" && (t.publish_mode === "manual" || !metaEnabled)).length;

  return (
    <section className="mx-auto mt-8 max-w-7xl" aria-label="Publicar">
      <div className={cn("rounded-2xl border bg-card p-4 sm:p-5", due && pendingManual > 0 && "border-warning ring-2 ring-warning/30")}>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Send className="size-5" /> Publicar
          </h2>
          <p className="text-sm text-muted-foreground">
            {due && pendingManual > 0
              ? "⏰ Ya es hora: publica en las redes pendientes y márcalas como publicadas."
              : scheduledAt
                ? `Programada para el ${fmt(scheduledAt, "d 'de' MMMM 'a las' HH:mm")}`
                : "Sin fecha programada"}
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {targets.map((t) => (
            <TargetCard
              key={t.network}
              postId={postId}
              target={t}
              text={t.caption_override ?? caption}
              firstComment={firstComment}
              files={files}
              profile={profiles[t.network] ?? null}
              editable={editable}
              auto={t.publish_mode === "auto" && metaEnabled}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function TargetCard({
  postId,
  target: t,
  text,
  firstComment,
  files,
  profile,
  editable,
  auto,
}: {
  postId: string;
  target: Target;
  text: string;
  firstComment: string;
  files: { url: string; filename: string }[];
  profile: string | null;
  editable: boolean;
  auto: boolean;
}) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = NETWORK_INFO[t.network].label;

  async function copy(what: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(what);
    toast.success("Copiado. Pégalo en " + label);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadAll() {
    // Descarga uno tras otro (los navegadores bloquean muchas descargas simultáneas)
    files.forEach((f, i) =>
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `${f.url}&download=${encodeURIComponent(f.filename)}`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 700),
    );
  }

  return (
    <li className="grid gap-3 rounded-xl border p-4" aria-label={`Publicar en ${label}`}>
      <div className="flex items-center gap-2">
        <NetworkBadge network={t.network} size="md" />
        <span className="flex-1 font-medium">{label}</span>
        {t.status === "published" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            <Check className="size-3" /> Publicado
          </span>
        ) : t.status === "failed" ? (
          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">Error</span>
        ) : auto ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            <Zap className="size-3" /> Automática
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Manual</span>
        )}
      </div>

      {t.status === "published" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {t.published_at && <span>{fmt(t.published_at, "d MMM, HH:mm")}</span>}
          {t.permalink && (
            <a href={t.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Ver publicación <ExternalLink className="size-3" />
            </a>
          )}
          {t.error && <span className="w-full text-xs text-warning">{t.error}</span>}
        </div>
      )}

      {t.status === "failed" && <p className="text-sm text-destructive">{t.error}</p>}

      {t.status === "pending" && auto && (
        <p className="text-sm text-muted-foreground">Se publicará sola a la hora programada. Si prefieres hacerlo a mano, usa los botones de abajo.</p>
      )}

      {t.status !== "published" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copy("text", text)}>
            {copied === "text" ? <Check /> : <Copy />} Copiar texto
          </Button>
          {firstComment.trim() && (
            <Button size="sm" variant="outline" onClick={() => copy("comment", firstComment)}>
              {copied === "comment" ? <Check /> : <Copy />} Copiar 1er comentario
            </Button>
          )}
          {files.length > 0 && (
            <Button size="sm" variant="outline" onClick={downloadAll}>
              <Download /> Descargar {files.length > 1 ? `${files.length} archivos` : "archivo"}
            </Button>
          )}
          {profile && (
            <Button size="sm" variant="ghost" asChild>
              <a href={profile} target="_blank" rel="noreferrer">
                <ExternalLink /> Abrir {label}
              </a>
            </Button>
          )}
        </div>
      )}

      {editable && t.status !== "published" && (
        <form
          className="flex flex-col gap-2 border-t pt-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await markTargetPublished(postId, t.network, link);
              if (r.error) return void toast.error(r.error);
              toast.success(`Marcado como publicado en ${label}`);
              router.refresh();
            });
          }}
        >
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Enlace a la publicación (opcional)" aria-label={`Enlace en ${label}`} className="h-8" />
          <Button size="sm" type="submit" disabled={pending}>
            <Check /> Marcar publicado
          </Button>
        </form>
      )}

      {editable && t.status !== "pending" && (
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await markTargetPending(postId, t.network);
              if (r.error) return void toast.error(r.error);
              toast.success(t.status === "failed" ? "Se volverá a intentar" : "Marcado como pendiente");
              router.refresh();
            })
          }
        >
          <RotateCcw /> {t.status === "failed" ? "Reintentar" : "Deshacer"}
        </Button>
      )}
    </li>
  );
}

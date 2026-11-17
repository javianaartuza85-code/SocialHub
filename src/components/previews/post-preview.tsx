"use client";

import {
  BarChart2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Repeat2,
  Send,
  Share,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import type { Network, PostFormat } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PreviewMedia = { id: string; url: string; kind: "image" | "video"; width?: number | null; height?: number | null };

export type PreviewProps = {
  network: Network;
  format: PostFormat;
  caption: string;
  firstComment: string;
  media: PreviewMedia[];
  account: { name: string; handle: string; avatar: string | null; color: string };
};

/** Resalta #hashtags, @menciones y enlaces y respeta los saltos de línea. */
function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/((?:^|\s)[#@][\p{L}\p{N}_.]+|https?:\/\/\S+)/u);
  return (
    <span className={cn("break-words whitespace-pre-wrap", className)}>
      {parts.map((part, i) =>
        /^(\s?)[#@]|^https?:/u.test(part) ? (
          <span key={i} className="text-[#00376b] dark:text-[#e0f1ff]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/** Texto truncado con "más", como lo muestran las redes. */
function Truncated({ text, limit, moreLabel = "más", className }: { text: string; limit: number; moreLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const lines = text.split("\n");
  const tooLong = [...text].length > limit || lines.length > 3;
  if (!tooLong || open) return <RichText text={text} className={className} />;
  let cut = [...text].slice(0, limit).join("");
  const firstLines = lines.slice(0, 3).join("\n");
  if (firstLines.length < cut.length) cut = firstLines;
  return (
    <span className={className}>
      <RichText text={cut.trimEnd()} />
      <button type="button" onClick={() => setOpen(true)} className="text-muted-foreground">
        … {moreLabel}
      </button>
    </span>
  );
}

function Avatar({ account, size = 32 }: { account: PreviewProps["account"]; size?: number }) {
  return account.avatar ? (
    <img src={account.avatar} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: account.color }}
    >
      {account.name.slice(0, 1)}
    </span>
  );
}

function MediaView({ item, className, cover = true }: { item: PreviewMedia; className?: string; cover?: boolean }) {
  return item.kind === "image" ? (
    <img src={item.url} alt="" className={cn("size-full", cover ? "object-cover" : "object-contain", className)} />
  ) : (
    <video src={item.url} muted loop playsInline autoPlay className={cn("size-full", cover ? "object-cover" : "object-contain", className)} />
  );
}

/** Carrusel deslizable con flechas y puntos. */
function Carousel({ media, aspect, dots = "below" }: { media: PreviewMedia[]; aspect: string; dots?: "below" | "overlay" }) {
  const [i, setI] = useState(0);
  const idx = Math.min(i, media.length - 1);
  if (!media.length)
    return <div className={cn("grid place-items-center bg-muted text-xs text-muted-foreground", aspect)}>Sin imagen</div>;
  return (
    <div>
      <div className={cn("relative overflow-hidden bg-black", aspect)}>
        <MediaView item={media[idx]} />
        {media.length > 1 && (
          <>
            <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
              {idx + 1}/{media.length}
            </span>
            {idx > 0 && (
              <button type="button" aria-label="Anterior" onClick={() => setI(idx - 1)} className="absolute top-1/2 left-2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black shadow">
                <ChevronLeft className="size-4" />
              </button>
            )}
            {idx < media.length - 1 && (
              <button type="button" aria-label="Siguiente" onClick={() => setI(idx + 1)} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black shadow">
                <ChevronRight className="size-4" />
              </button>
            )}
          </>
        )}
        {media.length > 1 && dots === "overlay" && <Dots n={media.length} i={idx} className="absolute inset-x-0 bottom-2" light />}
      </div>
      {media.length > 1 && dots === "below" && <Dots n={media.length} i={idx} className="py-2" />}
    </div>
  );
}

function Dots({ n, i, className, light }: { n: number; i: number; className?: string; light?: boolean }) {
  return (
    <div className={cn("flex justify-center gap-1", className)}>
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className={cn("size-1.5 rounded-full", k === i ? (light ? "bg-white" : "bg-[#0095f6]") : light ? "bg-white/50" : "bg-muted-foreground/30")} />
      ))}
    </div>
  );
}

const frame = "mx-auto w-full max-w-[380px] overflow-hidden rounded-xl border bg-card text-[13px] leading-snug text-card-foreground shadow-sm";

function InstagramPreview({ format, caption, firstComment, media, account }: PreviewProps) {
  if (format === "reel" || format === "video") return <VerticalVideo network="instagram" caption={caption} media={media} account={account} />;
  const first = media[0];
  const portrait = first?.width && first?.height && first.height > first.width;
  return (
    <div className={frame}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px]">
          <span className="block rounded-full bg-card p-[1.5px]">
            <Avatar account={account} size={28} />
          </span>
        </span>
        <span className="flex-1 font-semibold">{account.handle.replace(/^@/, "")}</span>
        <MoreHorizontal className="size-4" />
      </div>
      <Carousel media={media} aspect={portrait ? "aspect-[4/5]" : "aspect-square"} />
      <div className="grid gap-1.5 px-3 pt-1 pb-3">
        <div className="flex items-center gap-3.5 [&_svg]:size-[22px]">
          <Heart />
          <MessageCircle className="-scale-x-100" />
          <Send />
          <Bookmark className="ml-auto" />
        </div>
        <p className="font-semibold">1.234 Me gusta</p>
        {caption && (
          <p>
            <span className="mr-1 font-semibold">{account.handle.replace(/^@/, "")}</span>
            <Truncated text={caption} limit={125} />
          </p>
        )}
        {firstComment && (
          <p className="text-muted-foreground">
            <span className="mr-1 font-semibold text-card-foreground">{account.handle.replace(/^@/, "")}</span>
            <Truncated text={firstComment} limit={80} />
          </p>
        )}
        <p className="text-[11px] text-muted-foreground uppercase">Hace un momento</p>
      </div>
    </div>
  );
}

function FacebookPreview({ format, caption, firstComment, media, account }: PreviewProps) {
  if (format === "reel") return <VerticalVideo network="facebook" caption={caption} media={media} account={account} />;
  return (
    <div className={frame}>
      <div className="flex items-center gap-2.5 px-3 pt-3">
        <Avatar account={account} size={36} />
        <div className="flex-1">
          <p className="font-semibold">{account.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Ahora · <Globe className="size-3" />
          </p>
        </div>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      {caption && (
        <p className="px-3 py-2.5">
          <Truncated text={caption} limit={480} moreLabel="Ver más" />
        </p>
      )}
      {media.length > 0 &&
        (format === "carousel" && media.length > 1 ? (
          <div className="grid grid-cols-2 gap-0.5">
            {media.slice(0, 4).map((m, k) => (
              <div key={m.id} className="relative aspect-square">
                <MediaView item={m} />
                {k === 3 && media.length > 4 && (
                  <span className="absolute inset-0 grid place-items-center bg-black/50 text-2xl font-semibold text-white">+{media.length - 4}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="aspect-[4/3] bg-black">
            <MediaView item={media[0]} cover={false} />
          </div>
        ))}
      <div className="flex justify-between px-3 py-2 text-xs text-muted-foreground">
        <span>👍❤️ 87</span>
        <span>12 comentarios</span>
      </div>
      <div className="mx-3 grid grid-cols-3 border-t py-1 text-xs font-medium text-muted-foreground [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:gap-1.5 [&>span]:py-1.5 [&_svg]:size-4">
        <span>
          <ThumbsUp /> Me gusta
        </span>
        <span>
          <MessageCircle /> Comentar
        </span>
        <span>
          <Share /> Compartir
        </span>
      </div>
      {firstComment && (
        <div className="flex gap-2 border-t px-3 py-2.5">
          <Avatar account={account} size={24} />
          <p className="rounded-2xl bg-muted px-3 py-1.5 text-xs">
            <span className="block font-semibold">{account.name}</span>
            <RichText text={firstComment} />
          </p>
        </div>
      )}
    </div>
  );
}

function VerticalVideo({ network, caption, media, account }: { network: Network; caption: string; media: PreviewMedia[]; account: PreviewProps["account"] }) {
  const item = media.find((m) => m.kind === "video") ?? media[0];
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-xl bg-black text-[13px] text-white shadow-sm">
      {item ? <MediaView item={item} /> : <div className="grid size-full place-items-center text-xs text-white/60">Agrega un video</div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pt-16 pb-4">
        <div className="mb-2 flex items-center gap-2">
          <Avatar account={account} size={28} />
          <span className="font-semibold">{network === "facebook" ? account.name : account.handle.replace(/^@/, "")}</span>
          {network !== "tiktok" && <span className="rounded-md border border-white/70 px-2 py-0.5 text-[11px] font-semibold">Seguir</span>}
        </div>
        {caption && (
          <p className="pr-10">
            <Truncated text={caption} limit={70} />
          </p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/85">
          <Music2 className="size-3" /> Audio original · {account.handle}
        </p>
      </div>
      <div className="absolute right-2.5 bottom-24 grid gap-4 text-center text-[11px] [&_svg]:mx-auto [&_svg]:size-7 [&_svg]:drop-shadow">
        <span>
          <Heart className="fill-white" />
          12,4 mil
        </span>
        <span>
          <MessageCircle className="fill-white" />
          318
        </span>
        <span>
          <Bookmark className="fill-white" />
          1.024
        </span>
        <span>
          <Share className="fill-white" />
          Compartir
        </span>
      </div>
    </div>
  );
}

function TikTokPreview(props: PreviewProps) {
  if (props.format === "carousel" && props.media.length) {
    return (
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-xl bg-black text-[13px] text-white shadow-sm">
        <div className="absolute inset-0 flex items-center">
          <Carousel media={props.media} aspect="aspect-square w-full" dots="overlay" />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-12 pb-4">
          <p className="mb-1 font-semibold">{props.account.handle}</p>
          <Truncated text={props.caption} limit={70} />
        </div>
      </div>
    );
  }
  return <VerticalVideo network="tiktok" caption={props.caption} media={props.media} account={props.account} />;
}

function LinkedInPreview({ format, caption, firstComment, media, account }: PreviewProps) {
  return (
    <div className={frame}>
      <div className="flex items-start gap-2.5 px-3 pt-3">
        <Avatar account={account} size={44} />
        <div className="flex-1">
          <p className="font-semibold">{account.name}</p>
          <p className="text-xs text-muted-foreground">2.614 seguidores</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Ahora · <Globe className="size-3" />
          </p>
        </div>
        <span className="text-sm font-semibold text-[#0a66c2]">+ Seguir</span>
      </div>
      {caption && (
        <p className="px-3 py-2.5">
          <Truncated text={caption} limit={210} moreLabel="más" />
        </p>
      )}
      {media.length > 0 &&
        (format === "carousel" ? (
          <Carousel media={media} aspect="aspect-square" />
        ) : (
          <div className="aspect-[1.91/1] bg-black">
            <MediaView item={media[0]} />
          </div>
        ))}
      <div className="flex justify-between px-3 py-2 text-xs text-muted-foreground">
        <span>👍💡 54</span>
        <span>6 comentarios · 3 veces compartido</span>
      </div>
      <div className="mx-3 grid grid-cols-4 border-t py-1 text-[11px] font-medium text-muted-foreground [&>span]:flex [&>span]:flex-col [&>span]:items-center [&>span]:gap-0.5 [&>span]:py-1 [&_svg]:size-4">
        <span>
          <ThumbsUp /> Recomendar
        </span>
        <span>
          <MessageCircle /> Comentar
        </span>
        <span>
          <Repeat2 /> Compartir
        </span>
        <span>
          <Send /> Enviar
        </span>
      </div>
      {firstComment && (
        <div className="flex gap-2 border-t px-3 py-2.5">
          <Avatar account={account} size={28} />
          <p className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs">
            <span className="block font-semibold">{account.name}</span>
            <RichText text={firstComment} />
          </p>
        </div>
      )}
    </div>
  );
}

function XPreview({ caption, firstComment, media, account }: PreviewProps) {
  const grid = media.slice(0, 4);
  return (
    <div className={cn(frame, "text-[14px]")}>
      <Tweet account={account} text={caption} media={grid} />
      {firstComment && (
        <div className="border-t">
          <Tweet account={account} text={firstComment} media={[]} reply />
        </div>
      )}
    </div>
  );
}

function Tweet({ account, text, media, reply }: { account: PreviewProps["account"]; text: string; media: PreviewMedia[]; reply?: boolean }) {
  return (
    <div className="flex gap-2.5 px-3 py-3">
      <Avatar account={account} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className="font-bold">{account.name}</span> <span className="text-muted-foreground">{account.handle} · ahora</span>
        </p>
        {reply && <p className="text-xs text-muted-foreground">Respondiendo a {account.handle}</p>}
        {text && <RichText text={text} className="mt-0.5 block" />}
        {media.length > 0 && (
          <div className={cn("mt-2.5 grid aspect-video gap-0.5 overflow-hidden rounded-2xl border", media.length > 1 && "grid-cols-2", media.length > 2 && "grid-rows-2")}>
            {media.map((m, k) => (
              <div key={m.id} className={cn("relative min-h-0", media.length === 3 && k === 0 && "row-span-2")}>
                <MediaView item={m} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex justify-between pr-6 text-xs text-muted-foreground [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&_svg]:size-4">
          <span>
            <MessageCircle /> 4
          </span>
          <span>
            <Repeat2 /> 12
          </span>
          <span>
            <Heart /> 87
          </span>
          <span>
            <BarChart2 /> 2,1 mil
          </span>
        </div>
      </div>
    </div>
  );
}

export function PostPreview(props: PreviewProps) {
  switch (props.network) {
    case "instagram":
      return <InstagramPreview {...props} />;
    case "facebook":
      return <FacebookPreview {...props} />;
    case "tiktok":
      return <TikTokPreview {...props} />;
    case "linkedin":
      return <LinkedInPreview {...props} />;
    case "x":
      return <XPreview {...props} />;
  }
}

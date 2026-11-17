import { charCount, countHashtags, NETWORK_INFO, type Network, type PostFormat, type PostStatus } from "./constants";

export type RuleInput = {
  format: PostFormat;
  networks: Network[];
  caption: string;
  overrides: Partial<Record<Network, string | null>>;
  media: { kind: "image" | "video" }[];
  scheduled_at: string | null;
};

export type Issue = { level: "error" | "warning"; message: string };

/** Revisa la publicación y devuelve problemas. Los "error" impiden aprobar o programar. */
export function checkPost(p: RuleInput): Issue[] {
  const issues: Issue[] = [];
  const images = p.media.filter((m) => m.kind === "image").length;
  const videos = p.media.filter((m) => m.kind === "video").length;

  if (!p.networks.length) issues.push({ level: "error", message: "Elige al menos una red social." });

  for (const n of p.networks) {
    const info = NETWORK_INFO[n];
    const text = p.overrides[n] ?? p.caption;
    const chars = charCount(text, n);
    if (chars > info.maxChars) issues.push({ level: "error", message: `${info.label}: el texto supera el límite (${chars}/${info.maxChars}).` });
    if (info.maxHashtags && countHashtags(text) > info.maxHashtags)
      issues.push({ level: "error", message: `${info.label}: máximo ${info.maxHashtags} hashtags.` });
    if (!info.formats.includes(p.format)) issues.push({ level: "warning", message: `${info.label} no admite bien este formato.` });
    if ((n === "instagram" || n === "tiktok") && p.media.length === 0)
      issues.push({ level: "error", message: `${info.label} necesita al menos una imagen o video.` });
    if (n === "tiktok" && p.format !== "carousel" && videos === 0) issues.push({ level: "warning", message: "TikTok funciona mejor con video." });
  }

  if (p.format === "carousel" && p.media.length < 2) issues.push({ level: "error", message: "Un carrusel necesita al menos 2 archivos." });
  if (p.format === "carousel" && p.media.length > 10) issues.push({ level: "error", message: "Un carrusel admite máximo 10 archivos." });
  if ((p.format === "video" || p.format === "reel") && videos !== 1)
    issues.push({ level: "error", message: p.format === "reel" ? "Un reel necesita exactamente 1 video." : "Agrega exactamente 1 video." });
  if (p.format === "post" && p.media.length > 1) issues.push({ level: "warning", message: "Tienes varias imágenes: ¿quieres que sea un carrusel?" });
  if (p.format === "post" && videos > 0) issues.push({ level: "warning", message: "Para un video, elige el formato Video o Reel." });
  if (!p.caption.trim() && images + videos === 0) issues.push({ level: "error", message: "La publicación está vacía." });

  return issues;
}

/** Requisitos mínimos para pasar a cada estado. */
export function canMoveTo(status: PostStatus, p: RuleInput): string | null {
  const errors = checkPost(p).filter((i) => i.level === "error");
  if (status === "in_review" || status === "approved") {
    if (errors.length) return errors[0].message;
  }
  if (status === "scheduled") {
    if (errors.length) return errors[0].message;
    if (!p.scheduled_at) return "Elige la fecha y hora de publicación.";
    if (new Date(p.scheduled_at).getTime() < Date.now() - 60_000) return "La fecha de publicación ya pasó.";
  }
  return null;
}

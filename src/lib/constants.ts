import type { Database } from "./supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Network = Enums["social_network"];
export type PostStatus = Enums["post_status"];
export type PostFormat = Enums["post_format"];
export type UserRole = Enums["user_role"];
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export const NETWORKS: Network[] = ["instagram", "facebook", "tiktok", "linkedin", "x"];

/**
 * Límites de cada red. Revísalos de vez en cuando: las redes los cambian.
 * `autoPublish` indica si la app puede publicar automáticamente (Meta) o si es modo manual.
 */
export const NETWORK_INFO: Record<
  Network,
  { label: string; color: string; maxChars: number; maxHashtags?: number; autoPublish: boolean; formats: PostFormat[] }
> = {
  instagram: { label: "Instagram", color: "#E1306C", maxChars: 2200, maxHashtags: 30, autoPublish: true, formats: ["post", "carousel", "video", "reel"] },
  facebook: { label: "Facebook", color: "#1877F2", maxChars: 63206, autoPublish: true, formats: ["post", "carousel", "video", "reel"] },
  tiktok: { label: "TikTok", color: "#111111", maxChars: 4000, autoPublish: false, formats: ["video", "reel", "carousel"] },
  linkedin: { label: "LinkedIn", color: "#0A66C2", maxChars: 3000, autoPublish: false, formats: ["post", "carousel", "video"] },
  x: { label: "X", color: "#000000", maxChars: 280, autoPublish: false, formats: ["post", "carousel", "video"] },
};

export const STATUS_ORDER: PostStatus[] = ["idea", "draft", "in_review", "approved", "scheduled", "published"];

export const STATUS_INFO: Record<PostStatus, { label: string; className: string; dot: string }> = {
  idea: { label: "Idea", className: "bg-slate-500/12 text-slate-700 dark:text-slate-300", dot: "bg-slate-400" },
  draft: { label: "Borrador", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300", dot: "bg-amber-500" },
  in_review: { label: "En revisión", className: "bg-violet-500/15 text-violet-800 dark:text-violet-300", dot: "bg-violet-500" },
  approved: { label: "Aprobado", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-500" },
  scheduled: { label: "Programado", className: "bg-sky-500/15 text-sky-800 dark:text-sky-300", dot: "bg-sky-500" },
  published: { label: "Publicado", className: "bg-primary/15 text-primary", dot: "bg-primary" },
  failed: { label: "Error al publicar", className: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
};

export const FORMAT_INFO: Record<PostFormat, { label: string }> = {
  post: { label: "Imagen / texto" },
  carousel: { label: "Carrusel" },
  video: { label: "Video" },
  reel: { label: "Reel" },
};

export const ROLE_INFO: Record<UserRole, { label: string; description: string }> = {
  admin: { label: "Administrador", description: "Todo, incluido el equipo y las conexiones" },
  editor: { label: "Editor", description: "Crea y edita clientes, publicaciones y métricas" },
  viewer: { label: "Solo lectura", description: "Puede ver todo, sin modificar" },
};

export function countHashtags(text: string) {
  return (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
}

/** X cuenta los enlaces como 23 caracteres. Para el resto usamos la longitud real. */
export function charCount(text: string, network: Network) {
  const chars = [...text].length;
  if (network !== "x") return chars;
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  return urls.reduce((n, u) => n - [...u].length + 23, chars);
}

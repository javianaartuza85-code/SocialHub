import "server-only";

/**
 * Integración con la API Graph de Meta (Facebook e Instagram).
 * Requiere META_APP_ID y META_APP_SECRET. Sin ellas, la app funciona en modo manual.
 */
export const META_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${META_VERSION}`;

export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
];

export function metaConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export class MetaError extends Error {
  constructor(
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined>;

async function graph<T>(method: "GET" | "POST", path: string, params: Params, token?: string): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.set(k, String(v));
  if (token) body.set("access_token", token);
  const url = method === "GET" ? `${GRAPH}${path}?${body.toString()}` : `${GRAPH}${path}`;
  const res = await fetch(url, method === "GET" ? { method } : { method, body, headers: { "content-type": "application/x-www-form-urlencoded" } });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message: string; code?: number; is_transient?: boolean } };
  if (!res.ok || json.error) {
    const e = json.error;
    const msg = e?.message ?? `Error ${res.status} de Meta`;
    throw new MetaError(friendly(msg, e?.code), !!e?.is_transient || res.status >= 500 || e?.code === 4 || e?.code === 17);
  }
  return json;
}

function friendly(msg: string, code?: number) {
  if (code === 190) return "La conexión con Meta venció o fue revocada. Vuelve a conectar la cuenta en la ficha del cliente.";
  if (code === 10 || code === 200) return "Meta no dio permiso para publicar. Revisa los permisos de la app y de la página.";
  if (/aspect ratio/i.test(msg)) return "Instagram rechazó la proporción de la imagen (debe estar entre 4:5 y 1.91:1).";
  if (/image format|only.*jpe?g/i.test(msg)) return "Instagram solo publica imágenes JPG. Convierte la imagen y vuelve a intentarlo.";
  return `Meta respondió: ${msg}`;
}

// ─── Inicio de sesión (OAuth) ─────────────────────────────────────────────────
export function oauthUrl(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    state,
    scope: META_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${META_VERSION}/dialog/oauth?${p.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const short = await graph<{ access_token: string }>("GET", "/oauth/access_token", {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });
  // Token de larga duración (~60 días). Los tokens de página derivados de él no vencen.
  const long = await graph<{ access_token: string; expires_in?: number }>("GET", "/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: short.access_token,
  });
  return long;
}

export type MetaPage = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } };

export async function listPages(userToken: string) {
  const r = await graph<{ data: MetaPage[] }>("GET", "/me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: 100 }, userToken);
  return r.data;
}

// ─── Publicar ─────────────────────────────────────────────────────────────────
export type PublishMedia = { url: string; kind: "image" | "video" };
export type PublishInput = { caption: string; firstComment: string; format: "post" | "carousel" | "video" | "reel"; media: PublishMedia[] };
export type PublishResult = { id: string; permalink: string | null; warning?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForContainer(id: string, token: string) {
  // Los videos tardan en procesarse: revisamos hasta ~4 minutos
  for (let i = 0; i < 48; i++) {
    const s = await graph<{ status_code: string; status?: string }>("GET", `/${id}`, { fields: "status_code,status" }, token);
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new MetaError(`Instagram no pudo procesar el archivo (${s.status ?? s.status_code}).`);
    await sleep(i < 6 ? 2000 : 5000);
  }
  throw new MetaError("Instagram tardó demasiado en procesar el video. Se reintentará.", true);
}

export async function publishInstagram(igUserId: string, token: string, p: PublishInput): Promise<PublishResult> {
  if (!p.media.length) throw new MetaError("Instagram necesita al menos una imagen o video.");
  let creationId: string;

  if (p.media.length > 1 || p.format === "carousel") {
    const children: string[] = [];
    for (const m of p.media.slice(0, 10)) {
      const c = await graph<{ id: string }>(
        "POST",
        `/${igUserId}/media`,
        m.kind === "video" ? { media_type: "VIDEO", video_url: m.url, is_carousel_item: true } : { image_url: m.url, is_carousel_item: true },
        token,
      );
      if (m.kind === "video") await waitForContainer(c.id, token);
      children.push(c.id);
    }
    const parent = await graph<{ id: string }>("POST", `/${igUserId}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: p.caption }, token);
    creationId = parent.id;
  } else if (p.media[0].kind === "video") {
    const c = await graph<{ id: string }>("POST", `/${igUserId}/media`, { media_type: "REELS", video_url: p.media[0].url, caption: p.caption, share_to_feed: true }, token);
    creationId = c.id;
  } else {
    const c = await graph<{ id: string }>("POST", `/${igUserId}/media`, { image_url: p.media[0].url, caption: p.caption }, token);
    creationId = c.id;
  }
  await waitForContainer(creationId, token);
  const published = await graph<{ id: string }>("POST", `/${igUserId}/media_publish`, { creation_id: creationId }, token);

  let warning: string | undefined;
  if (p.firstComment.trim()) {
    try {
      await graph("POST", `/${published.id}/comments`, { message: p.firstComment }, token);
    } catch (e) {
      warning = `Se publicó, pero no se pudo agregar el primer comentario: ${(e as Error).message}`;
    }
  }
  const info = await graph<{ permalink?: string }>("GET", `/${published.id}`, { fields: "permalink" }, token).catch(() => ({ permalink: undefined }));
  return { id: published.id, permalink: info.permalink ?? null, warning };
}

export async function publishFacebook(pageId: string, token: string, p: PublishInput): Promise<PublishResult> {
  let postId: string;
  const video = p.media.find((m) => m.kind === "video");

  if (video) {
    const r = await graph<{ id: string }>("POST", `/${pageId}/videos`, { file_url: video.url, description: p.caption }, token);
    postId = r.id;
  } else if (p.media.length === 1) {
    const r = await graph<{ id: string; post_id?: string }>("POST", `/${pageId}/photos`, { url: p.media[0].url, caption: p.caption }, token);
    postId = r.post_id ?? r.id;
  } else if (p.media.length > 1) {
    const ids: string[] = [];
    for (const m of p.media.slice(0, 10)) {
      const r = await graph<{ id: string }>("POST", `/${pageId}/photos`, { url: m.url, published: false }, token);
      ids.push(r.id);
    }
    const params: Params = { message: p.caption };
    ids.forEach((id, i) => (params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
    const r = await graph<{ id: string }>("POST", `/${pageId}/feed`, params, token);
    postId = r.id;
  } else {
    const r = await graph<{ id: string }>("POST", `/${pageId}/feed`, { message: p.caption }, token);
    postId = r.id;
  }

  let warning: string | undefined;
  if (p.firstComment.trim()) {
    try {
      await graph("POST", `/${postId}/comments`, { message: p.firstComment }, token);
    } catch (e) {
      warning = `Se publicó, pero no se pudo agregar el primer comentario: ${(e as Error).message}`;
    }
  }
  const info = await graph<{ permalink_url?: string }>("GET", `/${postId}`, { fields: "permalink_url" }, token).catch(() => ({ permalink_url: undefined }));
  return { id: postId, permalink: info.permalink_url ?? null, warning };
}

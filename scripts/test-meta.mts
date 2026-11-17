/**
 * Prueba de la publicación automática con Meta usando una API simulada
 * (no se conecta a Meta de verdad). Ejecutar: npm run test:meta
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

process.env.META_APP_ID = "app-de-prueba";
process.env.META_APP_SECRET = "secreto-de-prueba";

const { encrypt } = await import("../src/lib/crypto");
const { runPublishing } = await import("../src/lib/publisher");

const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

// ── API de Meta simulada ─────────────────────────────────────────────────────
type Call = { method: string; path: string; params: Record<string, string> };
let calls: Call[] = [];
let failWith: { code: number; message: string } | null = null;
const realFetch = globalThis.fetch;
let seq = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname !== "graph.facebook.com") return realFetch(input, init);
  const method = init?.method ?? "GET";
  const params = Object.fromEntries(method === "GET" ? url.searchParams : new URLSearchParams(String(init?.body ?? "")));
  const path = url.pathname.replace(/^\/v[\d.]+/, "");
  calls.push({ method, path, params });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
  if (failWith) return json({ error: failWith }, 400);
  if (method === "GET" && params.fields === "status_code,status") return json({ status_code: "FINISHED" });
  if (method === "GET" && params.fields === "permalink") return json({ permalink: "https://www.instagram.com/p/SIMULADO/" });
  if (path.endsWith("/media_publish")) return json({ id: "IG_MEDIA_PUBLICADO" });
  return json({ id: `id_${++seq}` });
}) as typeof fetch;

// ── Escenario ────────────────────────────────────────────────────────────────
const { data: client } = await db.from("clients").select("id").eq("name", "Café Aroma").single();
const clientId = client!.id;
const { data: acc } = await db
  .from("client_social_accounts")
  .upsert({ client_id: clientId, network: "instagram", handle: "@cafearoma", connection: "auto", external_id: "17841400000000001" }, { onConflict: "client_id,network" })
  .select("id")
  .single();
await db.from("social_tokens").upsert({ account_id: acc!.id, access_token_encrypted: encrypt("TOKEN_DE_PAGINA") });
const { data: media } = await db.from("media_assets").select("id").eq("client_id", clientId).limit(2);

async function makePost(title: string) {
  const { data: post } = await db
    .from("posts")
    .insert({ client_id: clientId, title, caption: "Texto automático ☕", first_comment: "#CaféAroma", format: "carousel", status: "scheduled", scheduled_at: new Date(Date.now() - 30_000).toISOString() })
    .select("id")
    .single();
  await db.from("post_targets").insert({ post_id: post!.id, network: "instagram", publish_mode: "auto" });
  await db.from("post_media").insert(media!.map((m, i) => ({ post_id: post!.id, media_id: m.id, position: i })));
  return post!.id;
}

const cleanup: string[] = [];
try {
  // 1) Publicación correcta de un carrusel con primer comentario
  const ok = await makePost("Prueba Meta OK");
  cleanup.push(ok);
  const r1 = await runPublishing(db);
  assert.equal(r1.published, 1, "debería publicar 1 red");
  const posts = calls.filter((c) => c.method === "POST");
  assert.equal(posts.filter((c) => c.params.is_carousel_item === "true").length, 2, "2 elementos del carrusel");
  assert.ok(posts.some((c) => c.params.media_type === "CAROUSEL" && c.params.caption === "Texto automático ☕"), "contenedor del carrusel con el texto");
  assert.ok(posts.some((c) => c.path.endsWith("/media_publish")), "media_publish");
  assert.ok(posts.some((c) => c.path === "/IG_MEDIA_PUBLICADO/comments" && c.params.message === "#CaféAroma"), "primer comentario");
  assert.ok(calls.every((c) => c.params.access_token === "TOKEN_DE_PAGINA"), "usa el token descifrado");
  assert.ok(posts.filter((c) => c.params.image_url).every((c) => c.params.image_url.includes("/storage/v1/object/sign/media/")), "envía URLs firmadas");
  const { data: t1 } = await db.from("post_targets").select("status, permalink, external_post_id").eq("post_id", ok).single();
  assert.deepEqual(t1, { status: "published", permalink: "https://www.instagram.com/p/SIMULADO/", external_post_id: "IG_MEDIA_PUBLICADO" });
  const { data: p1 } = await db.from("posts").select("status").eq("id", ok).single();
  assert.equal(p1!.status, "published", "la publicación queda como Publicada");
  console.log("✔ Instagram: carrusel + primer comentario publicados");

  // 2) Token vencido (código 190): falla sin reintentos y avisa
  calls = [];
  failWith = { code: 190, message: "Error validating access token" };
  const bad = await makePost("Prueba Meta Error");
  cleanup.push(bad);
  const r2 = await runPublishing(db);
  assert.equal(r2.failed, 1);
  const { data: t2 } = await db.from("post_targets").select("status, error, attempts").eq("post_id", bad).single();
  assert.equal(t2!.status, "failed");
  assert.match(t2!.error!, /venció o fue revocada/);
  const { data: p2 } = await db.from("posts").select("status").eq("id", bad).single();
  assert.equal(p2!.status, "failed");
  const { count } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("post_id", bad).eq("type", "publish_failed");
  assert.ok((count ?? 0) > 0, "notifica el error al equipo");
  console.log("✔ Token vencido: queda en Error y se avisa al equipo");

  // 3) Error temporal de Meta: se reintenta en la siguiente vuelta
  failWith = { code: 2, message: "Service temporarily unavailable" };
  const retry = await makePost("Prueba Meta Reintento");
  cleanup.push(retry);
  globalThis.fetch = ((orig) =>
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      const r = await orig(input, init);
      if (String(input).includes("graph.facebook.com") && r.status === 400) return new Response(await r.text(), { status: 503 });
      return r;
    }) as typeof fetch)(globalThis.fetch);
  await runPublishing(db);
  const { data: t3 } = await db.from("post_targets").select("status, attempts").eq("post_id", retry).single();
  assert.deepEqual(t3, { status: "pending", attempts: 1 }, "queda pendiente para reintentar");
  console.log("✔ Error temporal: queda pendiente y se reintenta");
} finally {
  if (cleanup.length) await db.from("posts").delete().in("id", cleanup);
  await db.from("social_tokens").delete().eq("account_id", acc!.id);
  await db.from("client_social_accounts").update({ connection: "manual", external_id: null }).eq("id", acc!.id);
}
console.log("✔ Integración con Meta (simulada) correcta");

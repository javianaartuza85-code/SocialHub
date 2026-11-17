/** Verifica que las publicaciones de ejemplo cumplan las reglas del editor. */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { checkPost } from "../src/lib/post-rules";

const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data } = await db
    .from("posts")
    .select("title, status, format, caption, scheduled_at, post_targets(network, caption_override), post_media(media_assets(kind))")
    .in("status", ["in_review", "approved", "scheduled"]);
  let bad = 0;
  for (const p of data ?? []) {
    const errs = checkPost({
      format: p.format,
      networks: p.post_targets.map((t) => t.network),
      caption: p.caption,
      overrides: {},
      media: p.post_media.map((m) => ({ kind: m.media_assets!.kind })),
      scheduled_at: p.scheduled_at,
    }).filter((i) => i.level === "error");
    if (errs.length) {
      bad++;
      console.log(`✘ ${p.title}: ${errs.map((e) => e.message).join("; ")}`);
    }
  }
  console.log(bad ? `${bad} con errores` : `✔ ${data?.length} publicaciones de ejemplo válidas`);
  process.exit(bad ? 1 : 0);
})();

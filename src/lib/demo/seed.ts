import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Network, PostFormat, PostStatus } from "@/lib/constants";
import { zonedAt } from "@/lib/dates";

type DB = SupabaseClient<Database>;

type DemoPost = {
  title: string;
  caption: string;
  format: PostFormat;
  networks: Network[];
  /** días desde hoy (negativo = pasado) y hora local */
  day: number;
  hour: number;
  status?: PostStatus;
  firstComment?: string;
  images?: number;
  clientComment?: string;
};

type DemoClient = {
  name: string;
  industry: string;
  colors: [string, string, string];
  contact: { name: string; email: string; phone: string; website: string };
  notes: string;
  accounts: { network: Network; handle: string }[];
  baseFollowers: Partial<Record<Network, number>>;
  hashtagGroups: { name: string; hashtags: string[] }[];
  templates: { name: string; format: PostFormat; caption: string; networks: Network[] }[];
  folders: string[];
  imageLabels: { label: string; tags: string[]; folder: number }[];
  posts: DemoPost[];
};

const CLIENTS: DemoClient[] = [
  {
    name: "Café Aroma",
    industry: "Cafetería de especialidad",
    colors: ["#7c4a2d", "#e9c9a7", "#2f855a"],
    contact: { name: "Lucía Herrera", email: "lucia@cafearoma.example", phone: "+57 601 234 5678", website: "https://cafearoma.example" },
    notes: "Tono cercano y cálido. Evitar mencionar precios en los textos. Publican el menú de temporada cada mes.",
    accounts: [
      { network: "instagram", handle: "@cafearoma" },
      { network: "facebook", handle: "Café Aroma" },
      { network: "tiktok", handle: "@cafearoma" },
    ],
    baseFollowers: { instagram: 8200, facebook: 5400, tiktok: 2100 },
    hashtagGroups: [
      { name: "Marca", hashtags: ["#CaféAroma", "#CaféDeEspecialidad", "#CoffeeLovers"] },
      { name: "Local", hashtags: ["#Bogotá", "#Chapinero", "#CaféBogotá", "#Desayunos"] },
    ],
    templates: [
      { name: "Producto de la semana", format: "post", caption: "☕ Producto de la semana: [nombre]\n\n[Descripción en una frase]\n\nVen a probarlo esta semana 💛", networks: ["instagram", "facebook"] },
      { name: "Reel de preparación", format: "reel", caption: "Así preparamos nuestro [bebida] ✨ ¿Lo has probado?", networks: ["instagram", "tiktok"] },
    ],
    folders: ["Productos", "Local y equipo"],
    imageLabels: [
      { label: "Latte de temporada", tags: ["producto", "bebidas"], folder: 0 },
      { label: "Pan dulce", tags: ["producto", "panadería"], folder: 0 },
      { label: "Barra del café", tags: ["local"], folder: 1 },
      { label: "Nuestro equipo", tags: ["equipo"], folder: 1 },
      { label: "Cold brew", tags: ["producto", "bebidas"], folder: 0 },
    ],
    posts: [
      { title: "Latte de calabaza", caption: "Llegó la temporada 🍂 Nuestro latte de calabaza y especias ya está en barra.\n\n¿Con leche de avena o tradicional?", format: "post", networks: ["instagram", "facebook"], day: -18, hour: 9, images: 1 },
      { title: "Conoce al equipo", caption: "Detrás de cada taza hay manos que cuidan cada detalle. Hoy te presentamos a quienes hacen posible Café Aroma 💛", format: "carousel", networks: ["instagram", "facebook"], day: -11, hour: 12, images: 3 },
      { title: "Cómo hacemos el cold brew", caption: "18 horas de paciencia para el cold brew perfecto ❄️☕", format: "reel", networks: ["instagram", "tiktok"], day: -4, hour: 18, images: 1 },
      { title: "Pan dulce del día", caption: "Recién salido del horno 🥐 Conchas, cuernitos y orejas hasta agotar existencias.", format: "post", networks: ["instagram", "facebook"], day: 0, hour: 10, status: "scheduled", images: 1, firstComment: "#CaféAroma #PanDeBono #Bogotá #Desayunos" },
      { title: "Promo 2x1 martes", caption: "Los martes son de compartir: 2x1 en bebidas calientes de 4 a 6 pm ☕☕", format: "post", networks: ["instagram", "facebook", "tiktok"], day: 2, hour: 13, status: "approved", images: 1 },
      { title: "Menú de temporada", caption: "Nuevo menú de otoño 🍂 Desliza para conocer todas las bebidas.", format: "carousel", networks: ["instagram", "facebook"], day: 4, hour: 9, status: "in_review", images: 3, clientComment: "¿Podemos poner la foto del latte de calabaza primero?" },
      { title: "Taller de métodos de filtrado", caption: "Aprende a preparar café en V60 y Chemex con nuestro barista. Cupo limitado, regístrate en el link de la bio.", format: "video", networks: ["instagram", "facebook"], day: 9, hour: 17, status: "draft" },
      { title: "Día del café", caption: "", format: "reel", networks: ["instagram", "tiktok"], day: 15, hour: 10, status: "idea" },
      { title: "Reseñas de clientes", caption: "", format: "carousel", networks: ["instagram"], day: 21, hour: 12, status: "idea" },
    ],
  },
  {
    name: "FitZone Gym",
    industry: "Gimnasio y entrenamiento funcional",
    colors: ["#e11d48", "#111827", "#facc15"],
    contact: { name: "Diego Ramírez", email: "diego@fitzone.example", phone: "+57 300 123 4567", website: "https://fitzone.example" },
    notes: "Mensajes motivadores, energéticos. Siempre incluir llamada a la acción para la clase de prueba gratis.",
    accounts: [
      { network: "instagram", handle: "@fitzonegym" },
      { network: "facebook", handle: "FitZone Gym" },
      { network: "tiktok", handle: "@fitzone" },
      { network: "x", handle: "@fitzonegym" },
    ],
    baseFollowers: { instagram: 15300, facebook: 9800, tiktok: 22400, x: 1300 },
    hashtagGroups: [
      { name: "Motivación", hashtags: ["#FitZone", "#SinExcusas", "#Fitness", "#Entrenamiento"] },
      { name: "Clases", hashtags: ["#HIIT", "#Funcional", "#Spinning", "#Yoga"] },
    ],
    templates: [
      { name: "Rutina rápida", format: "reel", caption: "🔥 Rutina de [X] minutos para [objetivo]\n\n1. \n2. \n3. \n\nGuárdala para tu próximo entreno 💪", networks: ["instagram", "tiktok"] },
      { name: "Horario semanal", format: "carousel", caption: "📅 Horario de clases de esta semana. ¡Reserva tu lugar en la app!", networks: ["instagram", "facebook"] },
    ],
    folders: ["Clases", "Instalaciones"],
    imageLabels: [
      { label: "Clase de HIIT", tags: ["clases", "hiit"], folder: 0 },
      { label: "Zona de pesas", tags: ["instalaciones"], folder: 1 },
      { label: "Spinning", tags: ["clases"], folder: 0 },
      { label: "Coach Ana", tags: ["equipo", "clases"], folder: 0 },
    ],
    posts: [
      { title: "Reto de 30 días", caption: "¿Te sumas al reto de 30 días? 💪 Empieza el lunes y es gratis para socios.", format: "reel", networks: ["instagram", "tiktok"], day: -15, hour: 7, images: 1 },
      { title: "Nueva zona de pesas", caption: "Renovamos la zona de pesas 🏋️ Más espacio, más equipos, cero excusas.", format: "carousel", networks: ["instagram", "facebook"], day: -8, hour: 8, images: 2 },
      { title: "Tip: hidratación", caption: "Bebe agua antes, durante y después de entrenar. Tu rendimiento te lo agradecerá 💧", format: "post", networks: ["x", "facebook"], day: -2, hour: 7 },
      { title: "Rutina de piernas en 10 min", caption: "🔥 Rutina de 10 minutos para piernas\n\n1. Sentadillas x20\n2. Zancadas x16\n3. Puente de glúteo x20\n\nGuárdala 💪", format: "carousel", networks: ["instagram", "tiktok"], day: 0, hour: 18, status: "scheduled", images: 3, firstComment: "#FitZone #SinExcusas #Piernas" },
      { title: "Horario semanal", caption: "📅 Horario de clases de esta semana. ¡Reserva tu lugar!", format: "carousel", networks: ["instagram", "facebook"], day: 1, hour: 7, status: "scheduled", images: 2 },
      { title: "Clase de prueba gratis", caption: "Tu primera clase va por nuestra cuenta 🎁 Escríbenos por DM para reservar.", format: "post", networks: ["instagram", "facebook", "x"], day: 3, hour: 12, status: "in_review", images: 1 },
      { title: "Coach Ana: tips de spinning", caption: "La coach Ana comparte 3 claves para aprovechar al máximo tu clase de spinning 🚴", format: "post", networks: ["instagram", "tiktok"], day: 5, hour: 19, status: "in_review", images: 1 },
      { title: "Antes y después: Carlos", caption: "", format: "carousel", networks: ["instagram", "facebook"], day: 11, hour: 12, status: "draft", images: 2 },
      { title: "Black Friday membresías", caption: "", format: "post", networks: ["instagram", "facebook", "x"], day: 10, hour: 9, status: "idea" },
    ],
  },
  {
    name: "Estudio Lumen",
    industry: "Estudio de diseño e interiorismo",
    colors: ["#0f766e", "#ccfbf1", "#8b5cf6"],
    contact: { name: "Valentina Ortiz", email: "hola@estudiolumen.example", phone: "+34 600 123 456", website: "https://estudiolumen.example" },
    notes: "Tono profesional y sobrio. LinkedIn es la red prioritaria. El cliente aprueba todo con 3 días de anticipación.",
    accounts: [
      { network: "instagram", handle: "@estudiolumen" },
      { network: "linkedin", handle: "Estudio Lumen" },
      { network: "x", handle: "@estudiolumen" },
    ],
    baseFollowers: { instagram: 4100, linkedin: 2600, x: 640 },
    hashtagGroups: [
      { name: "Diseño", hashtags: ["#Interiorismo", "#DiseñoDeInteriores", "#Arquitectura"] },
      { name: "Marca", hashtags: ["#EstudioLumen", "#ProyectoLumen"] },
    ],
    templates: [
      { name: "Caso de éxito", format: "carousel", caption: "Proyecto: [nombre]\n\nReto: \nSolución: \nResultado: ", networks: ["linkedin", "instagram"] },
    ],
    folders: ["Proyectos"],
    imageLabels: [
      { label: "Sala Proyecto Olivo", tags: ["proyecto", "residencial"], folder: 0 },
      { label: "Oficina Nébula", tags: ["proyecto", "corporativo"], folder: 0 },
      { label: "Paleta de materiales", tags: ["proceso"], folder: 0 },
    ],
    posts: [
      { title: "Proyecto Olivo", caption: "Luz natural, materiales nobles y una paleta cálida. Así transformamos este departamento de 80 m².", format: "carousel", networks: ["instagram", "linkedin"], day: -20, hour: 11, images: 2 },
      { title: "Tendencias 2027", caption: "5 tendencias de interiorismo que veremos el próximo año (y cómo aplicarlas sin remodelar todo).", format: "post", networks: ["linkedin", "x"], day: -9, hour: 9, images: 1 },
      { title: "Detrás del proyecto Nébula", caption: "Cómo diseñamos una oficina que favorece la concentración y la colaboración a la vez.", format: "carousel", networks: ["linkedin", "instagram"], day: 12, hour: 10, status: "in_review", images: 2, clientComment: "Me gusta. ¿Podemos mencionar al estudio de iluminación con el que colaboramos?" },
      { title: "Paleta de materiales", caption: "", format: "post", networks: ["instagram"], day: 18, hour: 12, status: "draft", images: 1 },
      { title: "Entrevista a Valentina", caption: "", format: "video", networks: ["linkedin"], day: 24, hour: 9, status: "idea" },
    ],
  },
];

function svgPlaceholder(label: string, colors: [string, string, string], index: number) {
  const [a, b, c] = colors;
  const angle = (index * 47) % 360;
  const safe = label.replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
<rect width="1080" height="1080" fill="url(#g)"/>
<circle cx="${780 - index * 60}" cy="${300 + index * 40}" r="260" fill="${b}" opacity=".35"/>
<circle cx="${260 + index * 50}" cy="${820 - index * 30}" r="180" fill="#fff" opacity=".12"/>
<text x="80" y="960" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#fff">${safe}</text>
</svg>`;
}

function at(day: number, hour: number) {
  return zonedAt(day, hour);
}

function statusFor(p: DemoPost): PostStatus {
  if (p.status) return p.status;
  return p.day < 0 ? "published" : "draft";
}

/** Carga los datos de ejemplo. Requiere un cliente con permisos de servidor (service role). */
export async function seedDemoData(db: DB, opts: { userId?: string } = {}) {
  const { count } = await db.from("clients").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) throw new Error("Ya hay clientes cargados; los datos de ejemplo solo se cargan en una cuenta vacía.");

  for (const c of CLIENTS) {
    const { data: client, error } = await db
      .from("clients")
      .insert({
        name: c.name,
        industry: c.industry,
        color_primary: c.colors[0],
        color_secondary: c.colors[1],
        color_accent: c.colors[2],
        contact_name: c.contact.name,
        contact_email: c.contact.email,
        contact_phone: c.contact.phone,
        website: c.contact.website,
        notes: c.notes,
      })
      .select("id")
      .single();
    if (error || !client) throw new Error("No se pudo crear el cliente: " + error?.message);
    const clientId = client.id;

    // Logo (SVG con las iniciales)
    const initials = c.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2);
    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="56" fill="${c.colors[0]}"/><text x="128" y="160" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="104" font-weight="700" fill="#ffffff">${initials}</text></svg>`;
    const logoPath = `${clientId}/logo.svg`;
    await db.storage.from("logos").upload(logoPath, new Blob([logoSvg], { type: "image/svg+xml" }), { upsert: true, contentType: "image/svg+xml" });
    const logoUrl = db.storage.from("logos").getPublicUrl(logoPath).data.publicUrl;
    await db.from("clients").update({ logo_url: logoUrl }).eq("id", clientId);

    await db.from("client_social_accounts").insert(
      c.accounts.map((a) => ({
        client_id: clientId,
        network: a.network,
        handle: a.handle,
        profile_url: null,
      })),
    );
    await db.from("hashtag_groups").insert(c.hashtagGroups.map((h) => ({ ...h, client_id: clientId })));
    await db.from("templates").insert(c.templates.map((t) => ({ ...t, client_id: clientId })));

    // Carpetas y medios
    const { data: folders } = await db
      .from("media_folders")
      .insert(c.folders.map((name) => ({ name, client_id: clientId })))
      .select("id");
    const mediaIds: string[] = [];
    for (const [i, img] of c.imageLabels.entries()) {
      const path = `${clientId}/demo-${i + 1}.svg`;
      const svg = svgPlaceholder(img.label, c.colors, i);
      const { error: upErr } = await db.storage
        .from("media")
        .upload(path, new Blob([svg], { type: "image/svg+xml" }), { upsert: true, contentType: "image/svg+xml" });
      if (upErr) throw new Error("No se pudo subir una imagen de ejemplo: " + upErr.message);
      const { data: asset } = await db
        .from("media_assets")
        .insert({
          client_id: clientId,
          folder_id: folders?.[img.folder]?.id ?? null,
          storage_path: path,
          kind: "image",
          mime: "image/svg+xml",
          size_bytes: svg.length,
          width: 1080,
          height: 1080,
          filename: `${img.label}.svg`,
          tags: img.tags,
          uploaded_by: opts.userId ?? null,
        })
        .select("id")
        .single();
      if (asset) mediaIds.push(asset.id);
    }

    // Publicaciones
    let mediaCursor = 0;
    for (const p of c.posts) {
      const status = statusFor(p);
      const when = at(p.day, p.hour);
      const { data: post, error: postErr } = await db
        .from("posts")
        .insert({
          client_id: clientId,
          title: p.title,
          caption: p.caption,
          first_comment: p.firstComment ?? "",
          format: p.format,
          status,
          scheduled_at: status === "idea" && p.day > 14 ? null : when.toISOString(),
          published_at: status === "published" ? when.toISOString() : null,
          created_by: opts.userId ?? null,
        })
        .select("id")
        .single();
      if (postErr || !post) throw new Error("No se pudo crear una publicación: " + postErr?.message);

      await db.from("post_targets").insert(
        p.networks.map((network) => ({
          post_id: post.id,
          network,
          publish_mode: "manual" as const,
          status: status === "published" ? ("published" as const) : ("pending" as const),
          published_at: status === "published" ? when.toISOString() : null,
        })),
      );

      const n = p.images ?? 0;
      if (n > 0 && mediaIds.length) {
        const rows = Array.from({ length: n }, (_, i) => ({
          post_id: post.id,
          media_id: mediaIds[(mediaCursor + i) % mediaIds.length],
          position: i,
        }));
        // evitar duplicados si hay menos imágenes que posiciones
        const unique = rows.filter((r, i) => rows.findIndex((x) => x.media_id === r.media_id) === i);
        await db.from("post_media").insert(unique);
        mediaCursor += n;
      }

      await db.from("post_status_history").insert({ post_id: post.id, to_status: status, actor_label: "Datos de ejemplo" });

      if (p.clientComment) {
        await db.from("post_comments").insert({
          post_id: post.id,
          author_name: c.contact.name,
          body: p.clientComment,
          is_client: true,
        });
      }
    }

    // Métricas de los últimos 6 meses (sin incluir el actual)
    const rows = [];
    const now = new Date();
    for (const [network, base] of Object.entries(c.baseFollowers) as [Network, number][]) {
      for (let m = 6; m >= 1; m--) {
        const month = new Date(Date.UTC(now.getFullYear(), now.getMonth() - m, 1));
        const growth = 1 + (6 - m) * 0.035 + ((network.length * m) % 5) * 0.004;
        const followers = Math.round(base * growth);
        // Cada red tiene su propio comportamiento (alcance y tasa de interacción)
        const profile = { instagram: [1.8, 0.052], facebook: [1.2, 0.028], tiktok: [3.1, 0.071], linkedin: [0.9, 0.034], x: [0.7, 0.019] }[network];
        const wave = ((m * 7 + network.length) % 10) / 20;
        const reach = Math.round(followers * (profile[0] + wave));
        rows.push({
          client_id: clientId,
          network,
          month: month.toISOString().slice(0, 10),
          followers,
          reach,
          impressions: Math.round(reach * 1.45),
          interactions: Math.round(reach * (profile[1] + ((m * 3) % 4) / 400)),
          posts_count: { instagram: 10, facebook: 8, tiktok: 6, linkedin: 4, x: 12 }[network] + ((m * 5) % 4),
        });
      }
    }
    await db.from("monthly_metrics").insert(rows);
  }
}

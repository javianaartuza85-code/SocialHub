/**
 * Crea usuarios de prueba y carga los datos de ejemplo.
 * Uso: npm run seed   (lee las claves de .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { seedDemoData } from "../src/lib/demo/seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const db = createClient<Database>(url, key, { auth: { persistSession: false } });

const PASSWORD = process.env.DEMO_PASSWORD || "demo12345";
const USERS = [
  { email: "admin@demo.test", full_name: "Ana Admin", role: "admin" as const },
  { email: "editor@demo.test", full_name: "Eduardo Editor", role: "editor" as const },
  { email: "lector@demo.test", full_name: "Laura Lectora", role: "viewer" as const },
];

async function main() {
  let adminId: string | undefined;
  for (const u of USERS) {
    const { data: list } = await db.auth.admin.listUsers();
    let user = list.users.find((x) => x.email === u.email);
    if (!user) {
      const { data, error } = await db.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });
      if (error) throw error;
      user = data.user;
    }
    await db.from("members").upsert({ user_id: user.id, role: u.role });
    if (u.role === "admin") adminId = user.id;
    console.log(`✔ Usuario ${u.email} (${u.role})`);
  }

  const { count } = await db.from("clients").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log("ℹ Ya hay clientes; no se cargan datos de ejemplo de nuevo.");
  } else {
    await seedDemoData(db, { userId: adminId });
    console.log("✔ Datos de ejemplo cargados (3 clientes)");
  }
  console.log(`\nEntra con admin@demo.test / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Une todas las migraciones en supabase/setup.sql (para pegar en el SQL Editor de Supabase)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const header = `-- ============================================================================
-- SOCIAL HUB — instalación completa de la base de datos
-- Pega TODO este archivo en Supabase → SQL Editor → New query y presiona "Run".
-- Solo se ejecuta una vez, en un proyecto nuevo.
-- (Archivo generado con: npm run db:bundle — no lo edites a mano)
-- ============================================================================
`;
const body = files.map((f) => `\n-- ─── ${f} ${"─".repeat(Math.max(0, 60 - f.length))}\n${readFileSync(`${dir}/${f}`, "utf8")}`).join("\n");
writeFileSync("supabase/setup.sql", header + body);
console.log(`supabase/setup.sql generado con ${files.length} migraciones`);

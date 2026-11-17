import { expect, type Page } from "@playwright/test";

// Las pruebas leen las mismas claves locales que la app
try {
  process.loadEnvFile(".env.local");
} catch {}

export const PASSWORD = process.env.DEMO_PASSWORD || "demo12345";

/** Consulta directa a la base de datos local (con permisos de servidor) para preparar escenarios. */
export async function adminRest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
export async function login(page: Page, email = "admin@demo.test") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
}

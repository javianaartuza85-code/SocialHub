import { expect, test } from "@playwright/test";
import { adminRest, login } from "./helpers";

test("la tarea automática exige el secreto", async ({ request }) => {
  const res = await request.get("/api/cron/publicar");
  expect(res.status()).toBe(401);
  const bad = await request.get("/api/cron/publicar", { headers: { authorization: "Bearer otro" } });
  expect(bad.status()).toBe(401);
});

test("modo manual: recordatorio a la hora, copiar, marcar publicado en cada red", async ({ page, request, context }, info) => {
  test.skip(info.project.name === "movil", "Se prueba una vez");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  // Escenario: "Horario semanal" (programada, IG + FB) ya llegó a su hora
  const [post] = await adminRest(`posts?title=eq.Horario%20semanal&select=id`);
  await adminRest(`posts?id=eq.${post.id}`, { method: "PATCH", body: JSON.stringify({ scheduled_at: new Date(Date.now() - 60_000).toISOString() }) });

  const run = await request.get("/api/cron/publicar", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(run.ok()).toBeTruthy();
  const summary = await run.json();
  expect(summary.reminded).toBeGreaterThanOrEqual(2);

  // Una segunda ejecución no repite el recordatorio
  const again = await (await request.get("/api/cron/publicar", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json();
  expect(again.reminded).toBe(0);

  await login(page);
  await expect(page.locator("#publicar-ahora").getByText("Horario semanal")).toBeVisible();
  await page.getByRole("button", { name: /Notificaciones/ }).first().click();
  await page.getByText("⏰ Es hora de publicar «Horario semanal» de FitZone Gym en Instagram, Facebook").click();
  await expect(page.getByRole("heading", { name: "Horario semanal" })).toBeVisible();

  const ig = page.getByRole("listitem", { name: "Publicar en Instagram" });
  const fb = page.getByRole("listitem", { name: "Publicar en Facebook" });
  await ig.getByRole("button", { name: "Copiar texto" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Horario de clases de esta semana");
  await expect(ig.getByRole("button", { name: /Descargar 2 archivos/ })).toBeVisible();

  await ig.getByLabel("Enlace en Instagram").fill("https://www.instagram.com/p/EJEMPLO/");
  await ig.getByRole("button", { name: "Marcar publicado" }).click();
  await expect(ig.getByText("Publicado", { exact: true })).toBeVisible();
  await expect(ig.getByRole("link", { name: /Ver publicación/ })).toHaveAttribute("href", "https://www.instagram.com/p/EJEMPLO/");
  await expect(page.getByText("Programado", { exact: true }).first()).toBeVisible();

  await fb.getByRole("button", { name: "Marcar publicado" }).click();
  await expect(fb.getByText("Publicado", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Publicado", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Programado → Publicado/)).toBeVisible();

  // Deshacer vuelve a Programado
  await page.getByRole("listitem", { name: "Publicar en Facebook" }).getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByText("Marcado como pendiente")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Programado", { exact: true }).first()).toBeVisible();
});

test("ajustes muestra el estado de la tarea automática y de Meta", async ({ page }) => {
  await login(page);
  await page.goto("/ajustes");
  await expect(page.getByText(/Última revisión:|aún no se ha ejecutado/)).toBeVisible();
  await expect(page.getByText("No configurada: todas las redes usan el modo manual.")).toBeVisible();
  await expect(page.getByText(/America\/Bogota/)).toBeVisible();
});

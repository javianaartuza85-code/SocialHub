import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { login } from "./helpers";

test("ver métricas: indicadores, gráficas y tabla", async ({ page }) => {
  await login(page);
  await page.goto("/metricas");
  await page.getByLabel("Cliente").selectOption({ label: "FitZone Gym" });
  await expect(page.getByRole("heading", { name: "Seguidores por red" })).toBeVisible();
  await expect(page.getByText("Tasa de interacción").first()).toBeVisible();
  await expect(page.getByText(/vs\. mes anterior/).first()).toBeVisible();
  // 4 redes → 4 líneas, con leyenda
  await expect(page.locator(".recharts-line")).toHaveCount(4);
  await expect(page.getByRole("list", { name: "Leyenda" }).getByText("TikTok")).toBeVisible();
  await page.getByRole("button", { name: "Ver tabla de datos" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table").getByText("Instagram").first()).toBeVisible();
});

test("registrar las métricas de un mes", async ({ page }, info) => {
  test.skip(info.project.name === "movil", "Se registra una vez");
  await login(page);
  await page.goto("/metricas");
  await page.getByLabel("Cliente").selectOption({ label: "Estudio Lumen" });
  await page.waitForURL(/cliente=/);
  await expect(page.locator(".recharts-line")).toHaveCount(3);
  await page.getByRole("button", { name: "Registrar métricas" }).click();
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit" }).format(new Date());
  await page.getByLabel("Mes", { exact: true }).fill(now);
  await page.getByLabel("Seguidores en Instagram").fill("5000");
  await page.getByLabel("Alcance en Instagram").fill("12000");
  await page.getByLabel("Interacciones en Instagram").fill("600");
  await page.getByLabel("Notas del mes (salen en el reporte PDF)").fill("Mes récord gracias al proyecto Olivo.");
  await page.getByRole("button", { name: "Guardar métricas" }).click();
  await expect(page.getByText("Métricas guardadas")).toBeVisible();
  await expect(page.getByText("5.000").first()).toBeVisible();
  await expect(page.getByText(/^5\s?%$/).first()).toBeVisible(); // 600 / 12.000

  // Al reabrir el mes se cargan los valores guardados
  await page.getByRole("button", { name: "Registrar métricas" }).click();
  await page.getByLabel("Mes", { exact: true }).fill(now);
  await expect(page.getByLabel("Seguidores en Instagram")).toHaveValue("5000");
});

test("exportar el reporte mensual en PDF", async ({ page }) => {
  await login(page, "lector@demo.test");
  await page.goto("/metricas");
  await page.getByLabel("Cliente").selectOption({ label: "Café Aroma" });
  await expect(page.getByRole("button", { name: "Registrar métricas" })).toHaveCount(0);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "PDF" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^reporte-cafe-aroma-\d{4}-\d{2}\.pdf$/);
  const file = readFileSync((await download.path())!);
  expect(file.subarray(0, 4).toString()).toBe("%PDF");
  expect(file.length).toBeGreaterThan(2000);
});

test("el reporte no se puede descargar sin sesión", async ({ request }) => {
  const res = await request.get("/api/reportes/00000000-0000-0000-0000-000000000000?mes=2026-10", { maxRedirects: 0 });
  expect(res.status()).toBe(401);
});

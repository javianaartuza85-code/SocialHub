import { expect, test, type Browser } from "@playwright/test";
import { login } from "./helpers";

async function createLink(page: import("@playwright/test").Page, client: string, label: string) {
  await page.goto("/clientes");
  await page.getByText(client).click();
  await page.getByRole("link", { name: "Aprobación" }).click();
  await page.getByRole("button", { name: "Crear enlace" }).click();
  await page.getByLabel("Nombre del enlace").fill(label);
  await page.getByRole("dialog").getByRole("button", { name: "Crear enlace" }).click();
  const url = await page.getByRole("textbox", { name: "Enlace de aprobación", exact: true }).inputValue();
  expect(url).toMatch(/\/aprobar\/[A-Za-z0-9_-]{40,}$/);
  await page.keyboard.press("Escape");
  return url;
}

async function anonymous(browser: Browser) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:3000" });
  return { ctx, page: await ctx.newPage() };
}

test.describe.configure({ mode: "serial" });

test("el cliente aprueba y pide cambios sin cuenta; el equipo recibe avisos", async ({ page, browser }, info) => {
  test.skip(info.project.name === "movil", "flujo completo en escritorio; el móvil verifica la vista");
  await login(page);
  // Primero enviamos un borrador a revisión desde el editor
  await page.goto("/clientes");
  await page.getByText("Estudio Lumen").click();
  await page.getByRole("link", { name: "Publicaciones", exact: true }).click();
  await page.getByText("Paleta de materiales").click();
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Estado: En revisión")).toBeVisible();

  const url = await createLink(page, "Estudio Lumen", "Para Valentina");

  const { ctx, page: client } = await anonymous(browser);
  await client.goto(url);
  await expect(client.getByRole("heading", { name: /Hola, Valentina/ })).toBeVisible();
  await expect(client.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const nebula = client.getByRole("listitem", { name: "Detrás del proyecto Nébula" });
  const paleta = client.getByRole("listitem", { name: "Paleta de materiales" });
  await expect(nebula).toBeVisible();
  await expect(paleta).toBeVisible();

  await client.getByLabel("Tu nombre").fill("Valentina Ortiz");
  await nebula.getByRole("button", { name: "Aprobar" }).click();
  await expect(client.getByText("¡Aprobada! Gracias 🙌")).toBeVisible();
  await expect(nebula).toHaveCount(0);

  await paleta.getByRole("button", { name: "Pedir cambios" }).click();
  await paleta.getByLabel("¿Qué te gustaría cambiar?").fill("Usemos tonos más cálidos.");
  await paleta.getByRole("button", { name: "Enviar" }).click();
  await expect(client.getByText("Enviamos tus cambios a la agencia")).toBeVisible();
  await expect(client.getByText("No tienes publicaciones pendientes de revisión.")).toBeVisible();

  await client.getByRole("tab", { name: /Aprobadas y publicadas/ }).click();
  await expect(client.getByRole("listitem", { name: "Detrás del proyecto Nébula" })).toBeVisible();
  await ctx.close();

  // El equipo ve el resultado
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Notificaciones \([1-9]/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /Notificaciones/ }).first().click();
  await expect(page.getByText("✅ Estudio Lumen aprobó «Detrás del proyecto Nébula»")).toBeVisible();
  await page.getByText("✏️ Estudio Lumen pidió cambios en «Paleta de materiales»").click();
  await expect(page.getByRole("heading", { name: "Paleta de materiales" })).toBeVisible();
  await expect(page.getByText("Usemos tonos más cálidos.")).toBeVisible();
  await expect(page.getByText("Valentina Ortiz (cliente)")).toBeVisible();
});

test("revocar un enlace lo desactiva de inmediato", async ({ page, browser }, info) => {
  await login(page);
  const url = await createLink(page, "Café Aroma", `Temporal ${info.project.name}`);
  const { ctx, page: client } = await anonymous(browser);
  await client.goto(url);
  await expect(client.getByRole("listitem", { name: "Menú de temporada" })).toBeVisible();

  await page.reload();
  const row = page.getByRole("listitem").filter({ hasText: `Temporal ${info.project.name}` });
  await row.getByRole("button", { name: "Revocar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Revocar" }).click();
  await expect(row.getByText("Revocado")).toBeVisible();

  await client.reload();
  await expect(client.getByRole("heading", { name: "Este enlace no está disponible" })).toBeVisible();
  await ctx.close();
});

test("un enlace inventado no muestra nada", async ({ page }) => {
  await page.goto("/aprobar/esto-no-es-un-token-valido-1234567890abcdef");
  await expect(page.getByRole("heading", { name: "Este enlace no está disponible" })).toBeVisible();
});

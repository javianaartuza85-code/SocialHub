import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function openLibrary(page: Page, client: string) {
  await page.goto("/medios");
  await page.getByLabel("Cliente").selectOption({ label: client });
  await expect(page.getByLabel("Cliente")).toHaveValue(/.+/);
  await page.waitForURL(/cliente=/);
}

test("subir imágenes y video, ver detalles, etiquetar, mover y eliminar", async ({ page }, info) => {
  test.skip(info.project.name === "movil", "La subida se prueba en escritorio; el móvil prueba la navegación.");
  await login(page);
  await openLibrary(page, "Estudio Lumen");

  // Crear carpeta
  await page.getByRole("button", { name: "Nueva carpeta" }).click();
  await page.getByLabel("Nombre de la carpeta").fill("Campaña Prueba");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("button", { name: /Campaña Prueba/ }).click();
  await expect(page.getByText("Aún no hay archivos aquí")).toBeVisible();

  // Subir 2 imágenes + 1 video dentro de la carpeta
  await page.getByTestId("media-upload").setInputFiles(["e2e/fixtures/foto.png", "e2e/fixtures/foto2.png", "e2e/fixtures/clip.webm"]);
  await expect(page.getByText("Subida terminada")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "foto.png" })).toBeVisible();
  await expect(page.getByRole("button", { name: "clip.webm" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Campaña Prueba\s*3/ })).toBeVisible();

  // Detalle: dimensiones leídas en el navegador, etiqueta nueva
  await page.getByRole("button", { name: "foto2.png" }).click();
  await expect(page.getByText(/400×500/)).toBeVisible();
  await page.getByLabel("Nueva etiqueta").fill("Navidad 2026");
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText("navidad-2026", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  // Filtro por etiqueta
  await page.getByRole("button", { name: "navidad-2026" }).click();
  await expect(page.getByRole("button", { name: "foto2.png" })).toBeVisible();
  await expect(page.getByRole("button", { name: "foto.png" })).toHaveCount(0);
  await page.getByRole("button", { name: "navidad-2026" }).click();

  // Filtro por tipo
  await page.getByLabel("Tipo").selectOption("video");
  await expect(page.getByRole("button", { name: "clip.webm" })).toBeVisible();
  await expect(page.getByRole("button", { name: "foto.png" })).toHaveCount(0);
  await page.getByLabel("Tipo").selectOption("");

  // Selección múltiple: mover a "Sin carpeta"
  await page.getByRole("listitem").filter({ hasText: "foto.png" }).getByRole("button", { name: "Seleccionar" }).click();
  await page.getByLabel("Mover a carpeta").selectOption("sin");
  await expect(page.getByRole("button", { name: "foto.png" })).toHaveCount(0);
  await page.getByRole("button", { name: /Sin carpeta/ }).click();
  await expect(page.getByRole("button", { name: "foto.png" })).toBeVisible();

  // Eliminar
  await page.getByRole("button", { name: "foto.png" }).click();
  await page.getByRole("button", { name: "Eliminar" }).click();
  await page.getByRole("dialog").last().getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("button", { name: "foto.png" })).toHaveCount(0);
});

test("los archivos son privados: sin URL firmada no se pueden ver", async ({ request }) => {
  const res = await request.get("http://127.0.0.1:54321/storage/v1/object/public/media/cualquiera.png");
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("la biblioteca de ejemplo muestra carpetas y etiquetas", async ({ page }) => {
  await login(page);
  await openLibrary(page, "Café Aroma");
  await expect(page.getByRole("button", { name: /Productos/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Latte de temporada.svg" })).toBeVisible();
  await page.getByRole("button", { name: "bebidas" }).click();
  await expect(page.getByRole("button", { name: "Cold brew.svg" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pan dulce.svg" })).toHaveCount(0);
});

test("solo lectura ve los archivos pero no puede subir", async ({ page }) => {
  await login(page, "lector@demo.test");
  await openLibrary(page, "Café Aroma");
  await expect(page.getByRole("button", { name: "Latte de temporada.svg" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Subir" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nueva carpeta" })).toHaveCount(0);
});

import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function newPostFor(page: Page, client: string) {
  await page.goto("/publicaciones/nueva");
  await page.getByLabel("Cliente").selectOption({ label: client });
  // espera a que se carguen las redes del cliente
  await page.waitForTimeout(500);
}

function inFuture(days: number, hour = 10) {
  const d = new Date(Date.now() + days * 864e5);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hour)}:00`;
}

test("crear un carrusel con archivos, hashtags y vista previa, y llevarlo hasta Programado", async ({ page, isMobile }) => {
  await login(page);
  await newPostFor(page, "Café Aroma");
  await page.getByLabel("Título interno").fill("Carrusel de prueba");
  await page.getByRole("radio", { name: "Carrusel" }).click();

  // Elegir 2 archivos de la biblioteca (en orden)
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Pan dulce.svg" }).click();
  await dialog.getByRole("button", { name: "Cold brew.svg" }).click();
  await dialog.getByRole("button", { name: "Agregar (2)" }).click();
  await expect(page.getByRole("list", { name: "Archivos de la publicación" }).getByRole("listitem")).toHaveCount(2);

  await page.getByLabel("Texto").fill("¡Nuevo menú! ☕ #CaféAroma\nVisítanos en Chapinero");
  await expect(page.getByTestId("counter-instagram")).toContainText("1/30 #");

  // Insertar un grupo de hashtags en el primer comentario
  await page.getByRole("button", { name: "Hashtags" }).click();
  await page.getByRole("button", { name: "En 1er comentario" }).click();
  await page.getByRole("button", { name: /^Local/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Primer comentario")).toHaveValue(/#Bogotá #Chapinero/);

  // Vista previa
  if (isMobile) await page.getByRole("button", { name: "Vista previa" }).click();
  const preview = page.getByRole("complementary", { name: "Vista previa" });
  await expect(preview.getByText("1/2")).toBeVisible();
  await preview.getByRole("button", { name: "Siguiente" }).click();
  await expect(preview.getByText("2/2")).toBeVisible();
  await preview.getByRole("tab", { name: /Facebook/ }).click();
  await expect(preview.getByText("Visítanos en Chapinero")).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Editar" }).click();

  await page.getByLabel("Fecha y hora de publicación").fill(inFuture(3));
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/publicaciones\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Carrusel de prueba" })).toBeVisible();

  // Avanzar por los estados
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Estado: En revisión")).toBeVisible();
  await page.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Estado: Aprobado")).toBeVisible();
  await page.getByRole("button", { name: "Programar" }).click();
  await expect(page.getByText("Estado: Programado")).toBeVisible();

  // Historial y orden de archivos conservados al recargar
  await page.reload();
  await expect(page.getByText(/Aprobado → Programado/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Archivos de la publicación" }).getByRole("img").first()).toHaveAttribute("alt", "Pan dulce.svg");
});

test("valida límites: X con más de 280 caracteres y reel sin video", async ({ page }) => {
  await login(page);
  await newPostFor(page, "FitZone Gym");
  await page.getByLabel("Título interno").fill("Texto largo");
  await page.getByLabel("Texto").fill("a".repeat(300));
  // FitZone tiene X: el contador lo marca en rojo
  await expect(page.getByTestId("counter-x")).toContainText("300/280");
  await expect(page.getByText("X: el texto supera el límite (300/280).")).toBeVisible();
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText(/supera el límite|necesita al menos una imagen/).first()).toBeVisible();
  await expect(page).toHaveURL(/nueva/);

  await page.getByRole("radio", { name: "Reel" }).click();
  await expect(page.getByText("Un reel necesita exactamente 1 video.")).toBeVisible();
});

test("texto personalizado por red se ve en la vista previa de esa red", async ({ page, isMobile }) => {
  await login(page);
  await newPostFor(page, "Estudio Lumen");
  await page.getByLabel("Texto").fill("Texto general para todas las redes");
  await page.getByText("Personalizar el texto por red").click();
  await page.getByRole("button", { name: /Toca para escribir uno distinto para X/ }).click();
  await page.locator("#ov-x").fill("Versión corta para X");
  if (isMobile) await page.getByRole("button", { name: "Vista previa" }).click();
  const preview = page.getByRole("complementary", { name: "Vista previa" });
  await preview.getByRole("tab", { name: /^X/ }).click();
  await expect(preview.getByText("Versión corta para X")).toBeVisible();
  await preview.getByRole("tab", { name: /LinkedIn/ }).click();
  await expect(preview.getByText("Texto general para todas las redes")).toBeVisible();
});

test("plantillas: usar una existente y guardar una nueva; gestionar grupos de hashtags", async ({ page }, info) => {
  await login(page);
  await newPostFor(page, "FitZone Gym");
  await page.getByRole("button", { name: "Plantillas" }).click();
  await page.getByRole("menuitem", { name: /Rutina rápida/ }).click();
  await expect(page.getByLabel("Texto")).toHaveValue(/Rutina de \[X\] minutos/);
  await expect(page.getByRole("radio", { name: "Reel" })).toHaveAttribute("aria-checked", "true");

  const tplName = `Plantilla ${info.project.name} ${Date.now() % 10000}`;
  await page.getByRole("button", { name: "Plantillas" }).click();
  await page.getByRole("menuitem", { name: "Guardar actual como plantilla" }).click();
  await page.getByLabel("Nombre de la plantilla").fill(tplName);
  await page.getByRole("button", { name: "Guardar plantilla" }).click();
  await expect(page.getByText("Plantilla guardada")).toBeVisible();

  // Pestaña de contenido del cliente
  await page.goto("/clientes");
  await page.getByText("FitZone Gym").click();
  await page.getByRole("link", { name: "Plantillas y hashtags" }).click();
  await expect(page.getByText(tplName)).toBeVisible();
  await page.getByRole("button", { name: "Nuevo grupo" }).click();
  await page.getByRole("textbox", { name: "Nombre" }).fill(`Navidad ${info.project.name}`);
  await page.getByRole("textbox", { name: "Hashtags" }).fill("navidad, #FitNavidad regalo");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("#navidad #FitNavidad #regalo")).toBeVisible();
});

test("comentar, duplicar y eliminar", async ({ page }, info) => {
  await login(page);
  await page.goto("/clientes");
  await page.getByText("Estudio Lumen").click();
  await page.getByText("Detrás del proyecto Nébula").click();
  // El comentario del cliente de ejemplo aparece marcado como "Cliente"
  await expect(page.getByText("¿Podemos mencionar al estudio de iluminación")).toBeVisible();
  const note = `Lo agrego en la siguiente versión (${info.project.name}).`;
  await page.getByLabel("Nuevo comentario").fill(note);
  await page.getByRole("button", { name: "Comentar" }).click();
  await expect(page.getByText(note)).toBeVisible();

  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Duplicar" }).click();
  await expect(page.getByRole("heading", { name: /\(copia\)/ })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Eliminar" }).click();
  await expect(page).toHaveURL(/\/calendario/);
});

test("solo lectura ve la publicación sin poder editar", async ({ page }) => {
  await login(page, "lector@demo.test");
  await page.goto("/clientes");
  await page.getByText("Café Aroma").click();
  await page.getByText("Promo 2x1 martes").click();
  await expect(page.getByRole("heading", { name: "Promo 2x1 martes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
  await expect(page.getByLabel("Texto")).toBeDisabled();
  await expect(page.getByLabel("Nuevo comentario")).toHaveCount(0);
});

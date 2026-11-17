import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const TZ = "America/Bogota";
function bogotaDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

test("el panel de inicio muestra hoy, aprobación pendiente y clientes sin contenido", async ({ page }) => {
  await login(page);
  const hoy = page.locator("#hoy");
  await expect(hoy.getByText("Pan dulce del día")).toBeVisible();
  await expect(hoy.getByText("Rutina de piernas en 10 min")).toBeVisible();
  await expect(page.locator("#aprobacion").getByText("Clase de prueba gratis")).toBeVisible();
  await expect(page.locator("#sin-contenido").getByText("Estudio Lumen")).toBeVisible();
  await expect(page.locator("#sin-contenido").getByText("Café Aroma")).toHaveCount(0);
});

test("calendario: vistas, filtros y abrir una publicación", async ({ page }) => {
  await login(page);
  await page.goto("/calendario?vista=dayGridMonth");
  const cal = page.getByTestId("calendar");
  await expect(cal.locator(".fc-event").first()).toBeVisible();

  // Filtro por cliente
  await page.getByLabel("Filtrar por cliente").selectOption({ label: "FitZone Gym" });
  await page.getByRole("radio", { name: "Lista" }).click();
  await expect(cal.getByText("Horario semanal")).toBeVisible();
  await expect(cal.getByText("Pan dulce del día")).toHaveCount(0);

  // Filtro por red + estado
  await page.getByLabel("Filtrar por red").selectOption("x");
  await expect(cal.getByText("Clase de prueba gratis")).toBeVisible();
  await expect(cal.getByText("Horario semanal")).toHaveCount(0);
  await page.getByRole("button", { name: "Quitar filtros" }).click();

  // Semana
  await page.getByRole("radio", { name: "Semana" }).click();
  await expect(cal.locator(".fc-timegrid")).toBeVisible();

  // Abrir publicación desde la lista
  await page.getByRole("radio", { name: "Lista" }).click();
  await cal.getByText("Pan dulce del día").click();
  await expect(page.getByRole("heading", { name: "Pan dulce del día" })).toBeVisible();
});

test("arrastrar y soltar reprograma la publicación conservando la hora", async ({ page, isMobile }) => {
  test.skip(isMobile, "Arrastrar se prueba en escritorio");
  await login(page);
  await page.goto("/calendario?vista=dayGridMonth");
  const cal = page.getByTestId("calendar");

  // "Promo 2x1 martes" está 2 días en el futuro. Vamos a su mes.
  const from = new Date(Date.now() + 2 * 864e5);
  const fromKey = bogotaDate(from);
  const nowMonth = bogotaDate(new Date()).slice(0, 7);
  if (fromKey.slice(0, 7) !== nowMonth) await page.getByRole("button", { name: "Siguiente" }).click();
  const plus = bogotaDate(new Date(from.getTime() + 864e5));
  const toKey = plus.slice(0, 7) === fromKey.slice(0, 7) ? plus : bogotaDate(new Date(from.getTime() - 864e5));

  const ev = cal.locator(".fc-event", { hasText: "Promo 2x1 martes" });
  await expect(ev).toBeVisible();
  const target = cal.locator(`td.fc-daygrid-day[data-date="${toKey}"]`);
  const a = (await ev.boundingBox())!;
  const b = (await target.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 5, a.y + a.height / 2 + 5, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByText("Publicación reprogramada")).toBeVisible();

  // Se guarda: al recargar sigue en el día nuevo y a las 13:00
  await page.reload();
  if (fromKey.slice(0, 7) !== nowMonth) await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(cal.locator(`td.fc-daygrid-day[data-date="${toKey}"]`).getByText("Promo 2x1 martes")).toBeVisible();
  await expect(cal.locator(".fc-event", { hasText: "Promo 2x1 martes" })).toContainText("13:00");
});

test("las publicaciones ya publicadas no se pueden arrastrar", async ({ page }) => {
  await login(page);
  await page.goto("/calendario?vista=dayGridMonth");
  const cal = page.getByTestId("calendar");
  await expect(cal.locator(".fc-event").first()).toBeVisible();
  // Busca alguna publicada visible en el mes (o en el anterior)
  let published = cal.locator(".fc-event", { hasText: "Cómo hacemos el cold brew" });
  if (!(await published.count())) {
    await page.getByRole("button", { name: "Anterior" }).click();
    published = cal.locator(".fc-event", { hasText: "Cómo hacemos el cold brew" });
  }
  await expect(published).toBeVisible();
  await expect(published).not.toHaveClass(/fc-event-draggable/);
  await expect(cal.locator(".fc-event-draggable").first()).toBeVisible();
});

test("tocar un día abre una publicación nueva con esa fecha", async ({ page }) => {
  await login(page);
  await page.goto("/calendario?vista=dayGridMonth");
  // Dos meses adelante no hay publicaciones de ejemplo: el día 15 está libre
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 15));
  const day = target.toISOString().slice(0, 10);
  await page.locator(`td.fc-daygrid-day[data-date="${day}"]`).click();
  await expect(page).toHaveURL(/\/publicaciones\/nueva\?fecha=/);
  await expect(page.getByLabel("Fecha y hora de publicación")).toHaveValue(`${day}T10:00`);
});

test("en el celular la vista inicial es la lista", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await login(page);
  await page.goto("/calendario");
  await expect(page.getByRole("radio", { name: "Lista" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("calendar").locator(".fc-list")).toBeVisible();
});

test("solo lectura: el calendario no permite arrastrar", async ({ page }) => {
  await login(page, "lector@demo.test");
  await page.goto("/calendario?vista=dayGridMonth");
  const cal = page.getByTestId("calendar");
  await expect(cal.locator(".fc-event").first()).toBeVisible();
  await expect(cal.locator(".fc-event-draggable")).toHaveCount(0);
});

import { expect, test } from "@playwright/test";
import { login, PASSWORD } from "./helpers";

test.describe("clientes", () => {
  test("crear, editar, archivar y restaurar un cliente", async ({ page }, info) => {
    const name = `Panadería Sol ${info.project.name} ${Date.now() % 100000}`;
    await login(page);
    await page.goto("/clientes/nuevo");
    await page.getByLabel("Nombre del cliente *").fill(name);
    await page.getByLabel("Rubro").fill("Panadería");
    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/logo.svg");
    await page.getByLabel("Correo").fill("contacto@sol.example");
    await page.getByRole("checkbox", { name: /Instagram/ }).check();
    await page.getByLabel("Usuario en Instagram").fill("@panaderiasol");
    await page.getByLabel("Notas internas").fill("Tono alegre.");
    await page.getByRole("button", { name: "Crear cliente" }).click();

    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("@panaderiasol")).toBeVisible();
    await expect(page.getByText("Tono alegre.")).toBeVisible();
    await expect(page.locator('img[src*="/logos/"]').first()).toBeVisible();

    // Editar
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Rubro").fill("Panadería artesanal");
    await page.getByRole("checkbox", { name: /TikTok/ }).check();
    await page.getByLabel("Usuario en TikTok").fill("@sol.tt");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Panadería artesanal")).toBeVisible();
    await expect(page.getByText("@sol.tt")).toBeVisible();

    // Archivar
    await page.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Archivar cliente" }).click();
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
    await page.goto("/clientes");
    await expect(page.getByText(name)).toHaveCount(0);
    await page.goto("/clientes?archivados=1");
    await expect(page.getByText(name)).toBeVisible();

    // Restaurar
    await page.getByText(name).click();
    await page.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Restaurar cliente" }).click();
    await expect(page.getByText("Archivado", { exact: true })).toHaveCount(0);
  });

  test("buscar clientes", async ({ page }) => {
    await login(page);
    await page.goto("/clientes");
    await page.getByLabel("Buscar cliente").fill("fitz");
    await page.getByLabel("Buscar cliente").press("Enter");
    await expect(page.getByText("FitZone Gym")).toBeVisible();
    await expect(page.getByText("Café Aroma")).toHaveCount(0);
  });

  test("la ficha muestra contacto, redes y próximas publicaciones", async ({ page }) => {
    await login(page);
    await page.goto("/clientes");
    await page.getByText("FitZone Gym").click();
    await expect(page.getByText("diego@fitzone.example")).toBeVisible();
    await expect(page.getByText("@fitzonegym").first()).toBeVisible();
    await expect(page.getByText("Rutina de piernas en 10 min")).toBeVisible();
    await page.getByRole("link", { name: "Publicaciones", exact: true }).click();
    await expect(page).toHaveURL(/\/publicaciones$/);
    await page.getByRole("link", { name: "En revisión", exact: true }).click();
    await expect(page).toHaveURL(/estado=in_review/);
    await expect(page.getByText("Clase de prueba gratis")).toBeVisible();
    await expect(page.getByText("Reto de 30 días")).toHaveCount(0);
  });

  test("solo lectura no puede crear ni editar", async ({ page }) => {
    await login(page, "lector@demo.test");
    await page.goto("/clientes");
    await expect(page.getByRole("link", { name: "Nuevo cliente" })).toHaveCount(0);
    await page.getByText("Café Aroma").click();
    await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
    await page.goto("/clientes/nuevo");
    await expect(page).toHaveURL("/clientes");
  });
});

test.describe("equipo", () => {
  test("invitar a alguien, que se registre y entre con su rol", async ({ page, browser }, info) => {
    const email = `nueva.${info.project.name}.${Date.now()}@demo.test`;
    await login(page);
    await page.goto("/equipo");
    await page.getByLabel("Invitar por correo").fill(email);
    await page.getByLabel("Rol").first().selectOption("viewer");
    await page.getByRole("button", { name: "Invitar" }).click();
    await expect(page.getByText(email)).toBeVisible();

    const ctx = await browser.newContext({ baseURL: "http://localhost:3000" });
    const p2 = await ctx.newPage();
    await p2.goto(`/registro?email=${encodeURIComponent(email)}`);
    await expect(p2.getByLabel("Correo electrónico")).toHaveValue(email);
    await p2.getByLabel("Tu nombre").fill(`Nueva Persona ${info.project.name}`);
    await p2.getByLabel("Contraseña").fill(PASSWORD);
    await p2.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(p2.getByRole("heading", { name: /Hola, Nueva/ })).toBeVisible();
    await ctx.close();

    await page.reload();
    await expect(page.getByText(`Nueva Persona ${info.project.name}`)).toBeVisible();
  });

  test("alguien sin invitación ve la pantalla de sin acceso", async ({ page }, info) => {
    await page.goto("/registro");
    await page.getByLabel("Tu nombre").fill("Intruso");
    await page.getByLabel("Correo electrónico").fill(`intruso.${info.project.name}.${Date.now()}@demo.test`);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Aún no tienes acceso" })).toBeVisible();
    await page.goto("/clientes");
    await expect(page).toHaveURL("/sin-acceso");
  });

  test("el editor no ve el formulario de invitación", async ({ page }) => {
    await login(page, "editor@demo.test");
    await page.goto("/equipo");
    await expect(page.getByLabel("Invitar por correo")).toHaveCount(0);
    await expect(page.getByText("Ana Admin")).toBeVisible();
  });
});

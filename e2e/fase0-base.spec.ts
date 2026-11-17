import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("sin sesión redirige al login", async ({ page }) => {
  await page.goto("/calendario");
  await expect(page).toHaveURL(/\/login\?next=%2Fcalendario/);
});

test("contraseña incorrecta muestra un error en español", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("admin@demo.test");
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});

test("el administrador entra y ve los 3 clientes de ejemplo", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: /Hola, Ana/ })).toBeVisible();
  for (const name of ["Café Aroma", "FitZone Gym", "Estudio Lumen"]) {
    await expect(page.getByText(name).first()).toBeVisible();
  }
});

test("el modo oscuro se aplica y se recuerda", async ({ page, isMobile }) => {
  await login(page);
  if (isMobile) await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("radio", { name: "Oscuro" }).last().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

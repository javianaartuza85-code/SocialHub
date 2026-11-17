import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.DEMO_PASSWORD || "demo12345";

export async function login(page: Page, email = "admin@demo.test") {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
}

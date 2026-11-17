import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const PAGES = ["/", "/metricas", "/ajustes", "/calendario", "/calendario?vista=dayGridMonth", "/calendario?vista=timeGridWeek", "/clientes", "/clientes/nuevo", "/medios", "/equipo", "/publicaciones/nueva"];

test("ninguna pantalla tiene scroll horizontal", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(800);
    const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scroll, `${path} se desborda (${scroll}px > ${inner}px)`).toBeLessThanOrEqual(inner);
  }
});

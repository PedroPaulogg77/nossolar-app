import { test, expect } from "@playwright/test";
import { defaults, newProperty } from "../../lib/domain";
import { emptyLiving } from "../../lib/living";

test("primeira visita abre imóveis compartilhados e orienta a primeira ação", async ({
  page,
}) => {
  let sharedPrice: number | null = null;
  const property = { ...newProperty(), name: "Imóvel compartilhado" };
  let shared = {
    version: 1 as const,
    properties: [property],
    preferences: defaults,
  };
  const user = {
    id: "00000000-0000-4000-8000-000000000002",
    aud: "authenticated",
    email: "vivian@example.com",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  await page.addInitScript((user) => {
    localStorage.setItem(
      "sb-kcjlanpusmdrgzpkbtam-auth-token",
      JSON.stringify({
        access_token: "fake-access",
        refresh_token: "fake-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      }),
    );
  }, user);
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.route("**/rest/v1/rpc/load_household", (route) =>
    route.fulfill({ json: shared }),
  );
  await page.route("**/rest/v1/rpc/ensure_household", (route) =>
    route.fulfill({ json: "00000000-0000-4000-8000-000000000001" }),
  );
  await page.route("**/rest/v1/rpc/save_household", (route) => {
    shared = route.request().postDataJSON().payload;
    sharedPrice = shared.properties[0].price;
    return route.fulfill({ json: null });
  });
  await page.route("**/rest/v1/rpc/load_living", (route) =>
    route.fulfill({ json: emptyLiving() }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Imóvel compartilhado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conheça o que já guardamos" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/primeira-visita-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/primeira-visita-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Ver um imóvel" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Preço anunciado (R$)").fill("350.000,00");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect.poll(() => sharedPrice).toBe(350000);
  const stored = await page.evaluate(() =>
    localStorage.getItem("nosso-lar-v1"),
  );
  expect(stored).toContain("Imóvel compartilhado");
  shared = {
    ...shared,
    properties: [
      { ...shared.properties[0], name: "Atualizado em outro aparelho" },
    ],
  };
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "Atualizado em outro aparelho" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Atualizado em outro aparelho" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conheça o que já guardamos" }),
  ).toHaveCount(0);
});

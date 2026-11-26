import { test, expect } from "@playwright/test";
import { seedTestProperty } from "./seed";

test.beforeEach(async ({ page }) => {
  await seedTestProperty(page);
});

test("abrir imóvel leva à leitura e depois ao planejamento", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  const detail = page.getByRole("dialog");
  await expect(detail.getByText("Como fica no nosso bolso")).toBeVisible();
  await expect(detail.getByLabel("Preço anunciado (R$)")).toHaveCount(0);
  await page.screenshot({ path: "test-results/imovel-resumo-desktop.png" });
  await detail.getByRole("button", { name: "Ver gastos por mês" }).click();
  await expect(
    page.getByRole("heading", { name: "Como fica no nosso bolso?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Imóvel do planejamento")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Nossa lista" }).click();
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  await detail.getByRole("button", { name: "Comparar" }).click();
  await expect(page.getByText("1/3 selecionados")).toBeVisible();
});

test("resumo e próximos passos cabem no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  await page.screenshot({ path: "test-results/imovel-resumo-mobile.png" });
  await expect(
    page.getByRole("button", { name: "Editar informações" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

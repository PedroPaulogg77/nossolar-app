import { expect, test } from "@playwright/test";

test("primeiro acesso começa sem imóvel inventado e filtros vazios têm saída", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Nossa lista começa aqui")).toBeVisible();
  await expect(page.getByText("Cobertura em avaliação")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Adicionar primeiro imóvel" }),
  ).toBeVisible();
  await expect(page.getByLabel("Buscar imóvel")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/empty-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/empty-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Adicionar primeiro imóvel" }).click();
  await page.getByLabel("Nome ou apelido").fill("Imóvel de teste");
  await page.getByLabel("Fase do imóvel").selectOption("Em obra");
  await page.getByRole("button", { name: "Salvar e avaliar depois" }).click();
  await page.getByRole("button", { name: "Em obra", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Imóvel de teste" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(page.getByText("Nenhum imóvel encontrado")).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca e filtros" }).click();
  await expect(
    page.getByRole("button", { name: "Todos", exact: true }).last(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Buscar imóvel").fill("sem resultado");
  await expect(page.getByText("Nenhum imóvel encontrado")).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca e filtros" }).click();
  await expect(
    page.getByRole("heading", { name: "Imóvel de teste" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/stage-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

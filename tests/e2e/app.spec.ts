import { test, expect } from "@playwright/test";
test("cadastro, persistência, comparação, avaliação e finanças", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nossos imóveis" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cobertura em avaliação" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-imoveis.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Adicionar imóvel", exact: true })
    .click();
  await page.getByLabel("Nome ou apelido").fill("Apartamento de teste");
  await page.getByLabel("Preço anunciado").fill("350000");
  await page.getByRole("button", { name: "Salvar e avaliar depois" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Apartamento de teste" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  await page.getByRole("button", { name: /Cobertura em avaliação/ }).click();
  await page.getByRole("button", { name: /Apartamento de teste/ }).click();
  await expect(page.getByText("Provisória · 0% completa")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/desktop-comparar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finanças", exact: true }).click();
  await expect(page.getByText("Planejamento parcial")).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-financas.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ajustar custos" }).click();
  await expect(page.getByText("R$ 396.000,00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Avaliação", exact: true }).click();
  for (const label of [
    "Financeiro",
    "Localização",
    "Planta e acabamento",
    "Condomínio",
    "Riscos",
  ])
    await page
      .getByLabel(`Nota de ${label}`, { exact: true })
      .selectOption("8");
  await expect(page.getByText("80.0 / 100")).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
});
test("mobile: navegação, cadastro e ausência de overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Cobertura em avaliação" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-imoveis.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Finanças", exact: true }).click();
  await page.screenshot({
    path: "test-results/mobile-financas.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Ajustar custos" }).click();
  await expect(page.getByLabel("Financiamento informado")).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-custos.png",
    fullPage: true,
  });
});
test("preferências, formulário inválido, favoritos e IA desligada", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Cobertura em avaliação" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Favoritar imóvel" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remover favorito" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Preferências", exact: true })
    .filter({ visible: true })
    .click();
  await page.getByLabel("Renda familiar bruta mensal").fill("9000");
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await page.getByRole("button", { name: "Finanças", exact: true }).click();
  await page
    .getByText("Nossas referências para este plano", { exact: true })
    .click();
  await expect(
    page.getByText(/Renda de referência: R\$\s9\.000,00/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Imóveis", exact: true }).click();
  await page
    .getByRole("button", { name: "Adicionar imóvel", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar e avaliar depois" }).click();
  await expect(page.getByText(/Informe pelo menos um nome/)).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  const response = await request.post("/api/import", {
    data: { text: "Teste de anúncio", consent: true },
  });
  expect(response.status()).toBe(503);
});
test("entrada parcial, reserva e ficha ampla", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  const dialog = page.getByRole("dialog");
  const width = await dialog.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(900);
  await expect(page.getByLabel("Suítes")).toBeVisible();
  await expect(page.getByLabel("Varanda")).toBeVisible();
  await page.getByRole("button", { name: "Custos", exact: true }).click();
  await page.getByLabel("Entrada em dinheiro (R$)").fill("90000");
  await page.getByLabel("Entrada parcelada").check();
  await page.getByLabel("Parte da entrada a parcelar").fill("30000");
  await page.getByLabel("Número de parcelas dessa parte").fill("3");
  await page.getByLabel("Mês da entrada / sinal: mês").selectOption("01");
  await page.getByLabel("Mês da entrada / sinal: ano").selectOption("2027");
  await page
    .getByLabel("Início das parcelas (se diferente do sinal): mês")
    .selectOption("02");
  await page
    .getByLabel("Início das parcelas (se diferente do sinal): ano")
    .selectOption("2027");
  await expect(page.getByText("R$ 60.000,00", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-edit-wide.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.getByRole("button", { name: "Finanças", exact: true }).click();
  await page.getByLabel("Valor disponível hoje (R$)").fill("50000");
  await expect(page.getByText("R$ 16.000,00", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Finanças", exact: true }).click();
  await expect(page.getByLabel("Valor disponível hoje (R$)")).toHaveValue(
    "50000",
  );
  await page.screenshot({
    path: "test-results/desktop-finance-reserve.png",
    fullPage: true,
  });
});

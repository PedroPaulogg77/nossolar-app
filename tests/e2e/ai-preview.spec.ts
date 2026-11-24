import { expect, test } from "@playwright/test";

test.skip(
  !process.env.E2E_AI_PREVIEW,
  "Executar com build local de IA habilitada",
);

test("prévia da IA organiza dados e abre cadastro preenchido", async ({
  page,
}) => {
  await page.route("**/api/import", (route) =>
    route.fulfill({
      json: {
        fields: {
          name: {
            valor: "Residencial de teste",
            origem: "Residencial de teste",
            confianca: "extraído",
          },
          price: { valor: 450000, origem: "R$ 450.000", confianca: "extraído" },
          area: { valor: 82, origem: "82 m²", confianca: "extraído" },
          city: {
            valor: "Campinas",
            origem: "Campinas",
            confianca: "extraído",
          },
          neighborhood: {
            valor: "Cambuí",
            origem: "Cambuí",
            confianca: "extraído",
          },
          rooms: { valor: 3, origem: "3 quartos", confianca: "extraído" },
          baths: { valor: 2, origem: "2 banheiros", confianca: "extraído" },
          suites: { valor: 1, origem: "1 suíte", confianca: "extraído" },
          parking: { valor: 2, origem: "2 vagas", confianca: "extraído" },
          balcony: { valor: true, origem: "varanda", confianca: "extraído" },
          condo: {
            valor: 650,
            origem: "condomínio R$ 650",
            confianca: "extraído",
          },
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Importar anúncio com IA" }).click();
  await page
    .getByLabel("Texto da página do anúncio")
    .fill("Residencial de teste com três quartos em Campinas, Cambuí.");
  await page.getByRole("button", { name: "Autorizar e extrair texto" }).click();
  await expect(page.getByRole("heading", { name: "Onde fica" })).toBeVisible();
  await expect(page.getByLabel("Suítes", { exact: true })).toHaveValue("1");
  await page.screenshot({
    path: "test-results/ai-preview-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/ai-preview-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Revisar no cadastro" }).click();
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue(
    "Campinas",
  );
  await expect(page.getByLabel("Bairro", { exact: true })).toHaveValue(
    "Cambuí",
  );
});

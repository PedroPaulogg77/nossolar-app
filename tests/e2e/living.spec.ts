import { test, expect } from "@playwright/test";
import { emptyLiving, livingSchema } from "../../lib/living";
test("catálogo inicial separado permite escolher itens para o planejamento", async ({
  page,
}) => {
  let saved = emptyLiving();
  await page.route("**/rest/v1/rpc/load_living", (route) =>
    route.fulfill({ json: saved }),
  );
  await page.route("**/rest/v1/rpc/save_living", (route) => {
    const body = route.request().postDataJSON();
    saved = {
      ...livingSchema.parse(body.payload),
      revision: saved.revision + 1,
    };
    return route.fulfill({ json: saved.revision });
  });
  await page.route("**/rest/v1/rpc/ensure_household", (route) =>
    route.fulfill({ json: "00000000-0000-4000-8000-000000000001" }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Lista inicial", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ideias para cada canto" }),
  ).toBeVisible();
  await expect(page.getByText("Fogão de piso com forno")).toBeVisible();
  await expect(page.getByText("Alimentos básicos de despensa")).toBeVisible();
  await page.screenshot({
    path: "test-results/starter-list-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Buscar na lista para a casa nova").fill("Sofá");
  await expect(page.getByText("Sofá", { exact: true })).toBeVisible();
  await page
    .locator(".starter-item")
    .filter({ hasText: "Sofá" })
    .getByRole("button", { name: "Adicionar" })
    .click();
  await expect
    .poll(() => saved.items.some((item) => item.name === "Sofá"))
    .toBe(true);
  await page.getByLabel("Buscar na lista para a casa nova").fill("");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/starter-list-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("compras, alternativas, imagens, persistência e coleções", async ({
  page,
}) => {
  test.setTimeout(60000);
  let saved = emptyLiving();
  await page.route("**/rest/v1/rpc/load_living", (route) =>
    route.fulfill({ json: saved }),
  );
  await page.route("**/rest/v1/rpc/save_living", (route) => {
    const body = route.request().postDataJSON();
    expect(body.expected_revision).toBe(saved.revision);
    saved = {
      ...livingSchema.parse(body.payload),
      revision: saved.revision + 1,
    };
    return route.fulfill({ json: saved.revision });
  });
  await page.route("**/rest/v1/rpc/ensure_household", (route) =>
    route.fulfill({ json: "00000000-0000-4000-8000-000000000001" }),
  );
  await page.route("**/storage/v1/object/nosso-lar-private/**", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.goto("/");
  const encoded = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 600;
    const x = c.getContext("2d")!;
    x.fillStyle = "#d7cbb8";
    x.fillRect(0, 0, 800, 600);
    return c.toDataURL("image/png").split(",")[1];
  });
  const photo = {
    name: "sala.png",
    mimeType: "image/png",
    buffer: Buffer.from(encoded, "base64"),
  };
  await page.getByRole("button", { name: "Mobília", exact: true }).click();
  await page
    .getByRole("button", { name: "Adicionar item", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/living-new-item-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Não tenho link" }).click();
  await page.getByLabel("Nome do item", { exact: true }).fill("Sofá");
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await page.getByLabel("Estimativa por unidade").fill("3.299,90");
  await page.getByText("Foto do item").click();
  await page.evaluate((encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const clip = new DataTransfer();
    clip.items.add(new File([bytes], "sala.png", { type: "image/png" }));
    document
      .querySelector(".living-photos")
      ?.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: clip, bubbles: true }),
      );
  }, encoded);
  await expect(
    page.getByRole("img", { name: "Foto de foto-colada.jpg" }),
  ).toBeVisible({ timeout: 20000 });
  for (const [index, price] of [
    [1, 100],
    [2, 150],
  ]) {
    await page
      .getByRole("button", { name: "Adicionar opção", exact: true })
      .click();
    await page.getByText(`Editar modelo ${index}`).click();
    await page.getByLabel(`Modelo da opção ${index}`).fill(`Modelo ${index}`);
    await page
      .getByLabel(`Preço no Pix da opção ${index} (R$)`)
      .fill(String(price));
    await page
      .getByLabel(`Preço no cartão da opção ${index} (R$)`)
      .fill(String(price));
    await page
      .getByLabel("Forma de pagamento deste modelo")
      .last()
      .selectOption("Parcelado");
    await page
      .getByLabel("Parcelas deste modelo")
      .last()
      .selectOption(index === 1 ? "8" : "12");
    await page
      .getByText("Loja, link e foto")
      .nth(index - 1)
      .click();
    await page
      .getByLabel(`Link da opção ${index}`)
      .fill(`https://example.com/produto-${index}`);
  }
  await page.locator(".option-choice input[type=radio]").nth(1).check();
  await page.getByLabel("Mês da compra").fill("2026-12");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/living-form-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Salvar item", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".shopping-price")).toContainText("R$ 300,00");
  expect(saved.items[0].estimate).toBe(3299.9);
  expect(saved.items[0].options.map((option) => option.installments)).toEqual([
    8, 12,
  ]);
  await page.reload();
  await page.getByRole("button", { name: "Mobília", exact: true }).click();
  await expect(
    page.locator(".shopping-row").getByText("Sofá", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Opção de Sofá" })
    .selectOption({ label: "Modelo 1 · R$ 100,00" });
  await expect(page.locator(".shopping-price")).toContainText("R$ 200,00");
  await page
    .getByRole("combobox", { name: "Opção de Sofá" })
    .selectOption({ label: "Modelo 2 · R$ 150,00" });
  await expect(page.locator(".shopping-price")).toContainText("R$ 300,00");
  await page
    .getByRole("combobox", { name: "Pagamento de Sofá" })
    .selectOption("installment-8");
  await expect
    .poll(
      () =>
        saved.items[0].options.find(
          (option) => option.id === saved.items[0].selected,
        )?.installments,
    )
    .toBe(8);
  await page
    .getByRole("combobox", { name: "Pagamento de Sofá" })
    .selectOption("installment-12");
  await expect
    .poll(
      () =>
        saved.items[0].options.find(
          (option) => option.id === saved.items[0].selected,
        )?.installments,
    )
    .toBe(12);
  await page
    .getByRole("button", { name: "Adicionar item", exact: true })
    .click();
  await page.getByRole("button", { name: "Não tenho link" }).click();
  await page.getByLabel("Nome do item", { exact: true }).fill(" sofá ");
  await page
    .getByRole("button", { name: "Adicionar opção", exact: true })
    .click();
  await page.getByText("Editar modelo 1").click();
  await page.getByLabel("Modelo da opção 1").fill("Modelo reunido");
  await page.getByLabel("Preço no Pix da opção 1 (R$)").fill("1.000,00");
  await page.getByRole("button", { name: "Salvar item", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".living-error")).toContainText(
    "foram reunidas nele",
  );
  expect(saved.items).toHaveLength(1);
  expect(saved.items[0].options).toHaveLength(3);
  await page.screenshot({
    path: "test-results/living-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/living-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Inspirações", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Suas coleções" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova coleção" }).click();
  await page.getByLabel("Nome da coleção").fill("Sala");
  await page.getByRole("button", { name: "Salvar coleção" }).click();
  await page.getByRole("button", { name: "Guardar inspiração" }).click();
  await page.getByLabel("Título da inspiração").fill("Luz natural");
  await page
    .getByLabel("Link de referência ou Pinterest")
    .fill("https://www.pinterest.com/pin/1234567890/");
  await page.getByLabel("Associar a um item").selectOption({ label: "Sofá" });
  await page.locator('input[type="file"]').setInputFiles(photo);
  await expect(
    page.getByRole("img", { name: "Foto de sala.jpg" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvar inspiração" }).click();
  await page.getByRole("button", { name: "Coleções" }).click();
  await page.screenshot({
    path: "test-results/inspirations-folders-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/inspirations-folders-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Nova coleção" }).click();
  await page.getByLabel("Nome da coleção").fill("Quarto");
  await page.getByRole("button", { name: "Salvar coleção" }).click();
  await page.getByRole("button", { name: "Coleções" }).click();
  await page.getByRole("button", { name: /Sala/ }).click();
  await page.getByRole("heading", { name: "Luz natural" }).click();
  await expect(
    page.getByRole("link", { name: "Abrir referência original" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/inspiration-resumo-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Editar inspiração" }).click();
  await page
    .getByRole("combobox", { name: "Coleção", exact: true })
    .selectOption({ label: "Quarto" });
  await page.getByRole("button", { name: "Salvar inspiração" }).click();
  await page.getByRole("button", { name: "Coleções" }).click();
  await page.getByRole("button", { name: /Quarto/ }).click();
  await expect(
    page.getByRole("heading", { name: "Luz natural" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/inspirations-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Inspirações", exact: true }).click();
  await page.getByRole("button", { name: /Quarto/ }).click();
  await expect(
    page.getByRole("heading", { name: "Luz natural" }),
  ).toBeVisible();
});

test("importação de produto e rascunho recuperável", async ({ page }) => {
  let saved = emptyLiving();
  await page.route("**/rest/v1/rpc/load_living", (route) =>
    route.fulfill({ json: saved }),
  );
  await page.route("**/rest/v1/rpc/save_living", (route) => {
    const body = route.request().postDataJSON();
    saved = {
      ...livingSchema.parse(body.payload),
      revision: saved.revision + 1,
    };
    return route.fulfill({ json: saved.revision });
  });
  await page.route("**/api/import-product", (route) => {
    expect(route.request().postDataJSON().text).toContain("BRM51IMK");
    return route.fulfill({
      json: {
        product: {
          item: "Geladeira",
          title: "Geladeira Frost Free Duplex 415 litros Brastemp",
          model: "BRM51IMK",
          price: 3999,
          store: "Loja exemplo",
          notes: "415 litros; frost free; duas portas",
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Mobília", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await expect(
    page.getByRole("heading", { name: "Você já tem um link do produto?" }),
  ).toBeVisible();
  await page
    .getByLabel("Link do anúncio")
    .fill("https://example.com/geladeira");
  await page
    .getByText("O site bloqueou? Cole o texto ou HTML da página")
    .click();
  await page
    .getByLabel("Texto ou HTML do produto")
    .fill("<html><body><h1>Geladeira Brastemp BRM51IMK</h1></body></html>");
  await page.getByRole("button", { name: "Preencher com IA" }).click();
  await expect(page.getByLabel("Nome do item")).toHaveValue("Geladeira");
  await expect(page.getByText("BRM51IMK")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/product-import-mobile.png" });
  await page.getByRole("button", { name: "Fechar" }).click();
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await expect(page.getByLabel("Nome do item")).toHaveValue("Geladeira");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".shopping-row")).toContainText("Geladeira");
  await expect(page.locator(".shopping-price")).toContainText("R$ 3.999,00");
});

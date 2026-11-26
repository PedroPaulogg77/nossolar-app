import { test, expect } from "@playwright/test";
import { emptyLiving, livingSchema } from "../../lib/living";
test("compras, alternativas, imagens, persistência e coleções", async ({
  page,
}) => {
  let saved = emptyLiving();
  await page.route("**/rest/v1/rpc/load_living", route => route.fulfill({ json: saved }));
  await page.route("**/rest/v1/rpc/save_living", route => {
    const body = route.request().postDataJSON();
    expect(body.expected_revision).toBe(saved.revision);
    saved = { ...livingSchema.parse(body.payload), revision: saved.revision + 1 };
    return route.fulfill({ json: saved.revision });
  });
  await page.route("**/rest/v1/rpc/ensure_household", route => route.fulfill({ json: "00000000-0000-4000-8000-000000000001" }));
  await page.route("**/storage/v1/object/nosso-lar-private/**", route => route.fulfill({ json: {} }));
  await page.goto("/");
  const encoded = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 800; c.height = 600; const x = c.getContext("2d")!; x.fillStyle = "#d7cbb8"; x.fillRect(0,0,800,600); return c.toDataURL("image/png").split(",")[1]; });
  const photo = { name: "sala.png", mimeType: "image/png", buffer: Buffer.from(encoded, "base64") };
  await page.getByRole("button", { name: "Mobília", exact: true }).click();
  await page
    .getByRole("button", { name: "Adicionar item", exact: true })
    .click();
  await page.getByLabel("Nome do item", { exact: true }).fill("Sofá");
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await page.getByLabel("Estimativa por unidade").fill("90");
  await page.getByText("Fotos e detalhes").click();
  await page.locator('input[type="file"]').first().setInputFiles(photo);
  await expect(
    page.getByRole("img", { name: "Foto de sala.jpg" }),
  ).toBeVisible();
  for (const [index, price] of [
    [1, 100],
    [2, 150],
  ]) {
    await page
      .getByRole("button", { name: "Adicionar opção", exact: true })
      .click();
    await page.getByLabel(`Modelo da opção ${index}`).fill(`Modelo ${index}`);
    await page.getByLabel(`Preço da opção ${index}`).fill(String(price));
    await page
      .getByLabel(`Link da opção ${index}`)
      .fill(`https://example.com/produto-${index}`);
  }
  await page.getByRole("radio", { name: "Escolher esta opção" }).nth(1).check();
  await page.getByLabel("Pagamento", { exact: false }).first().selectOption("Parcelado");
  await page.getByLabel("Número de parcelas").fill("3");
  await page.getByLabel("Mês da compra").fill("2026-12");
  await page.getByRole("button", { name: "Salvar item", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".shopping-price")).toContainText("R$ 300,00");
  await page.reload();
  await page.getByRole("button", { name: "Mobília", exact: true }).click();
  await expect(
    page.locator(".shopping-row").getByText("Sofá", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", {name:"Opção de Sofá"}).selectOption({label:"Modelo 1 · R$ 100,00"});
  await expect(page.locator(".shopping-price")).toContainText("R$ 200,00");
  await page.getByRole("combobox", {name:"Opção de Sofá"}).selectOption({label:"Modelo 2 · R$ 150,00"});
  await expect(page.locator(".shopping-price")).toContainText("R$ 300,00");
  await page.screenshot({
    path: "test-results/living-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({path:"test-results/living-mobile.png",fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Inspirações", exact: true }).click();
  await page.getByRole("button", { name: "Nova coleção" }).click();
  await page.getByLabel("Nome da coleção").fill("Sala");
  await page.getByRole("button", { name: "Salvar coleção" }).click();
  await page.getByRole("button", { name: "Adicionar referência" }).click();
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
  await page.getByRole("button", { name: "Nova coleção" }).click();
  await page.getByLabel("Nome da coleção").fill("Quarto");
  await page.getByRole("button", { name: "Salvar coleção" }).click();
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await page.getByRole("heading", { name: "Luz natural" }).click();
  await page
    .getByRole("combobox", { name: "Coleção", exact: true })
    .selectOption({ label: "Quarto" });
  await page.getByRole("button", { name: "Salvar inspiração" }).click();
  await page.getByRole("button", { name: "Sala", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Luz natural" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Quarto", exact: true }).click();
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
  await expect(
    page.getByRole("heading", { name: "Luz natural" }),
  ).toBeVisible();
});

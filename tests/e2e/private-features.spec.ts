import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("endereço publicado mostra somente a entrada privada sem sessão", async ({
  page,
}) => {
  await page.route("http://private.test/**", async (route) => {
    const url = route
      .request()
      .url()
      .replace("http://private.test", "http://127.0.0.1:3000");
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
  await page.goto("http://private.test/");
  await expect(
    page.getByRole("heading", { name: "Nosso lugar começa aqui." }),
  ).toBeVisible();
  await expect(page.getByLabel("Seu e-mail")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cobertura em avaliação" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/private-entry.png",
    fullPage: true,
  });
});
test("cidade e bairro geram filtros e mantêm seleção de comparação", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nossos imóveis" }),
  ).toBeVisible();
  for (const [name, city, neighborhood] of [
    ["Opção de teste A", "São Paulo", "Vila Mariana"],
    ["Opção de teste B", "Santos", "Gonzaga"],
  ]) {
    await page
      .getByRole("button", { name: "Adicionar imóvel", exact: true })
      .click();
    await page.getByLabel("Nome ou apelido").fill(name);
    await page.getByLabel("Cidade", { exact: true }).fill(city);
    await page.getByLabel("Bairro", { exact: true }).fill(neighborhood);
    await page.getByRole("button", { name: "Salvar e avaliar depois" }).click();
  }
  await page
    .getByLabel("Filtrar por cidade")
    .selectOption({ label: "São Paulo" });
  await expect(
    page.getByRole("heading", { name: "Opção de teste A" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Opção de teste B" }),
  ).toHaveCount(0);
  await expect(
    page
      .getByLabel("Filtrar por bairro")
      .getByRole("option", { name: "Vila Mariana" }),
  ).toHaveCount(1);
  await expect(
    page
      .getByLabel("Filtrar por bairro")
      .getByRole("option", { name: "Gonzaga" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  await page.getByRole("button", { name: /Opção de teste A/ }).click();
  await page.getByLabel("Filtrar por cidade").selectOption({ label: "Santos" });
  await page.getByRole("button", { name: /Opção de teste B/ }).click();
  await expect(
    page.getByRole("heading", { name: "Opção de teste A" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Opção de teste B" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/private-comparison.png",
    fullPage: true,
  });
});
test("anexos persistem, abrem e acompanham cópia completa", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  await page
    .getByLabel("O que vamos guardar?")
    .selectOption("Plano de pagamento");
  await page.getByLabel("Anexar arquivos", { exact: true }).setInputFiles({
    name: "Proposta-teste.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n1 0 obj <</Type /Catalog>> endobj\n%%EOF"),
  });
  await expect(
    page.getByRole("button", {
      name: /Proposta-teste\.pdf\s+Plano de pagamento/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.reload();
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  await page
    .getByRole("button", { name: /Proposta-teste\.pdf\s+Plano de pagamento/ })
    .click();
  await expect(page.getByTitle("Prévia de Proposta-teste.pdf")).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-attachments.png",
    fullPage: true,
  });
  const fileDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar Proposta-teste.pdf", exact: true })
    .click();
  const file = await fileDownload;
  expect(await fs.readFile((await file.path())!, "utf8")).toContain("%PDF-1.7");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page
    .getByRole("button", { name: "Preferências", exact: true })
    .filter({ visible: true })
    .click();
  await page
    .getByText("Guardar ou recuperar uma cópia", { exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar cópia com anexos" }).click();
  const backup = await download;
  const raw = await fs.readFile((await backup.path())!, "utf8");
  const data = JSON.parse(raw);
  expect(data.files).toHaveLength(1);
  expect(Buffer.from(data.files[0].data, "base64").toString()).toContain(
    "%PDF",
  );
  // A new device starts without IndexedDB files: restoring must recover both records and bytes.
  await page.evaluate(() => {
    localStorage.clear();
    return new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase("nosso-lar-files");
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Preferências", exact: true })
    .filter({ visible: true })
    .click();
  await page
    .getByText("Guardar ou recuperar uma cópia", { exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Recuperar uma cópia", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await expect(page.getByText("Backup restaurado.")).toBeVisible();
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  await page
    .getByRole("button", { name: /Proposta-teste\.pdf\s+Plano de pagamento/ })
    .click();
  await expect(page.getByTitle("Prévia de Proposta-teste.pdf")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("rejeita arquivo disfarçado e mostra foto real anexada no card", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  await page.getByLabel("Anexar arquivos", { exact: true }).setInputFiles({
    name: "invalido.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html>não é um PDF</html>"),
  });
  await expect(
    page.getByText(/conteúdo do arquivo não corresponde/),
  ).toBeVisible();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  await page.getByLabel("Anexar arquivos", { exact: true }).setInputFiles({
    name: "foto-teste.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    page.getByRole("button", { name: /foto-teste\.png\s+Foto/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByRole("img", { name: "Foto de Cobertura em avaliação" }),
  ).toBeVisible();
});

test("cola foto diretamente na ficha do imóvel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Cobertura em avaliação" }).click();
  await page.evaluate(() => {
    const bytes = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      ),
      (char) => char.charCodeAt(0),
    );
    const clipboardData = new DataTransfer();
    clipboardData.items.add(
      new File([bytes], "imagem.png", { type: "image/png" }),
    );
    document
      .querySelector(".attachments-section .attachment-paste")
      ?.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData,
        }),
      );
  });
  await expect(
    page.getByRole("button", { name: /foto-colada\.png\s+Foto/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByRole("img", { name: "Foto de Cobertura em avaliação" }),
  ).toBeVisible();
});

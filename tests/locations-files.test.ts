import { describe, it, expect } from "vitest";
import {
  newProperty,
  propertySchema,
  backupSchema,
  defaults,
} from "../lib/domain";
import {
  locationOptions,
  locationKey,
  matchesLocation,
  propertyLocation,
} from "../lib/locations";
import { validateFile, MAX_FILE_SIZE } from "../lib/attachment-types";
describe("Bairros, cidades e arquivos privados", () => {
  it("preserva localização antiga sem inventar cidade/bairro", () => {
    const p = newProperty();
    const old = {
      ...p,
      location: "Centro / São Paulo",
      city: undefined,
      neighborhood: undefined,
      attachments: undefined,
      listingHighlights: undefined,
    };
    const migrated = propertySchema.parse({ ...old, name: "Meu imóvel" });
    expect(migrated.city).toBe("");
    expect(migrated.neighborhood).toBe("");
    expect(propertyLocation(migrated)).toBe("Centro / São Paulo");
    expect(migrated.attachments).toEqual([]);
    expect(migrated.listingHighlights).toBe("");
  });
  it("gera filtros distintos, sem duplicar acentos, caixa ou espaços", () => {
    const a = { ...newProperty(), city: "São Paulo", neighborhood: "Centro" },
      b = { ...newProperty(), city: " sao paulo ", neighborhood: " centro " },
      c = { ...newProperty(), city: "Santos", neighborhood: "Gonzaga" };
    expect(locationOptions([a, b, c], "city")).toHaveLength(2);
    expect(
      locationOptions([a, b, c], "neighborhood", locationKey("São Paulo")),
    ).toEqual([["centro", "Centro"]]);
    expect(matchesLocation(c, locationKey("São Paulo"), "")).toBe(false);
  });
  it("mantém campos separados em backup", () => {
    const p = {
      ...newProperty(),
      name: "Teste",
      city: "Campinas",
      neighborhood: "Cambuí",
    };
    const parsed = backupSchema.parse({
      version: 1,
      properties: [p],
      preferences: defaults,
    });
    expect(parsed.properties[0].city).toBe("Campinas");
    expect(parsed.properties[0].neighborhood).toBe("Cambuí");
  });
  it("aceita PDF real e rejeita extensão enganosa ou arquivo ativo", async () => {
    expect(await validateFile(new Blob(["%PDF-1.7\ntest"]), "Plano.pdf")).toBe(
      "application/pdf",
    );
    await expect(
      validateFile(new Blob(["<script>bad</script>"]), "Plano.pdf"),
    ).rejects.toThrow("conteúdo");
    await expect(
      validateFile(new Blob(["<svg/>"]), "Foto.svg"),
    ).rejects.toThrow("Escolha");
    await expect(
      validateFile(new Blob(["x".repeat(MAX_FILE_SIZE + 1)]), "Grande.pdf"),
    ).rejects.toThrow("10 MB");
  });
});

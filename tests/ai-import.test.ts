import { describe, expect, it } from "vitest";
import { propertyFromAi, type AiPreview } from "../lib/ai-import";
import { propertySchema } from "../lib/domain";

const found = (valor: AiPreview[string]["valor"]) => ({
  valor,
  origem: "Trecho do anúncio",
  confianca: "extraído",
});

describe("importação do anúncio", () => {
  it("leva localização, planta e custos explícitos ao cadastro", () => {
    const property = propertyFromAi({
      name: found("Residencial de teste"),
      type: found("Na planta"),
      price: found("R$ 450.000,00"),
      area: found(82.5),
      city: found("Campinas"),
      neighborhood: found("Cambuí"),
      rooms: found(3),
      suites: found(1),
      balcony: found(true),
      delivery: found("2028-06"),
      condo: found("R$ 650,00"),
      cashEntry: found(90000),
      installmentTotal: found(30000),
      installments: found(12),
    });
    expect(propertySchema.safeParse(property).success).toBe(true);
    expect(property.city).toBe("Campinas");
    expect(property.neighborhood).toBe("Cambuí");
    expect(property.suites).toBe(1);
    expect(property.balcony).toBe(true);
    expect(property.delivery).toBe("2028-06");
    expect(property.price).toBe(450000);
    expect(property.finance.condo).toBe(650);
    expect(property.finance.installmentTotal).toBe(30000);
    expect(property.finance.split).toBe(true);
  });

  it("mantém campos não informados pendentes sem inventar valores", () => {
    const property = propertyFromAi({ name: found("Apartamento de teste") });
    expect(property.city).toBe("");
    expect(property.price).toBeNull();
    expect(property.finance.cashEntry).toBeNull();
    expect(property.balcony).toBeNull();
  });
});

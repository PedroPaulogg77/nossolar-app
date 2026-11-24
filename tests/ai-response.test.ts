import { describe, expect, it } from "vitest";
import { parseAiFieldsText, parseAiResponse } from "../lib/ai-response";

describe("resposta do Gemini", () => {
  it("aceita campos parciais e ignora partes de raciocínio", () => {
    const parsed = parseAiResponse({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: "pensamento interno" },
              { text: '{"city":{"valor":"Campinas","origem":"Campinas"},' },
              { text: '"suites":{"valor":1,"origem":"1 suíte"}}' },
            ],
          },
        },
      ],
    });
    expect(parsed.reason).toBeNull();
    expect(parsed.fields?.city?.valor).toBe("Campinas");
    expect(parsed.fields?.suites?.valor).toBe(1);
    expect(parsed.fields?.price).toBeUndefined();
  });

  it("distingue resposta incompleta de anúncio sem fatos", () => {
    expect(
      parseAiResponse({ candidates: [{ finishReason: "MAX_TOKENS" }] }).reason,
    ).toBe("MAX_TOKENS");
    expect(
      parseAiResponse({
        candidates: [{ content: { parts: [{ text: "{}" }] } }],
      }).reason,
    ).toBe("NO_FACTS");
    expect(
      parseAiResponse({
        candidates: [{ content: { parts: [{ text: "{incompleto" }] } }],
      }).reason,
    ).toBe("INVALID_JSON");
  });
});

describe("resposta do Groq", () => {
  it("valida JSON de campos parciais antes de preencher o imóvel", () => {
    const parsed = parseAiFieldsText(
      '{"name":{"valor":"Apartamento A","origem":"Apartamento A"},"parking":{"valor":2,"origem":"2 vagas"},"highlights":{"valor":"Piscina e coworking","origem":"Piscina e coworking"}}',
    );
    expect(parsed.reason).toBeNull();
    expect(parsed.fields?.parking?.valor).toBe(2);
    expect(parsed.fields?.highlights?.valor).toContain("coworking");
    expect(parseAiFieldsText("{}").reason).toBe("NO_FACTS");
  });
});

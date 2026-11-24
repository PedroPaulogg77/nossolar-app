import { describe, expect, it } from "vitest";
import { parseAiResponse } from "../lib/ai-response";

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

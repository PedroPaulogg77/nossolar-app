import { z } from "zod";

const field = z.object({
  valor: z.union([z.string(), z.number().nonnegative(), z.boolean(), z.null()]),
  origem: z.string().max(500).default("Anúncio"),
  confianca: z.enum(["extraído", "pendente"]).default("extraído"),
});

const fields = z
  .object({
    name: field,
    type: field,
    price: field,
    area: field,
    city: field,
    neighborhood: field,
    address: field,
    rooms: field,
    baths: field,
    suites: field,
    parking: field,
    balcony: field,
    elevator: field,
    floor: field,
    sun: field,
    delivery: field,
    condo: field,
    iptu: field,
    cashEntry: field,
    installmentTotal: field,
    installments: field,
    payment: field,
  })
  .partial();

type GeminiResult = {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
};

export function parseAiResponse(result: GeminiResult) {
  const candidate = result.candidates?.[0];
  const text = candidate?.content?.parts
    ?.filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text)
    return { fields: null, reason: candidate?.finishReason ?? "EMPTY" };
  return parseAiFieldsText(text);
}

export function parseAiFieldsText(text: string) {
  let json: unknown;
  try {
    json = JSON.parse(
      text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    );
  } catch {
    return { fields: null, reason: "INVALID_JSON" };
  }
  const parsed = fields.safeParse(json);
  if (!parsed.success) return { fields: null, reason: "INVALID_FIELDS" };
  if (
    !Object.values(parsed.data).some(
      (field) => field && field.valor !== null && field.valor !== "",
    )
  )
    return { fields: null, reason: "NO_FACTS" };
  return { fields: parsed.data, reason: null };
}

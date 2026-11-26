import { describe, it, expect } from "vitest";
import {
  newPurchase,
  itemTotal,
  budget,
  purchasesFlow,
  livingSchema,
  emptyLiving,
} from "../lib/living";
describe("orçamento da casa", () => {
  it("soma uma opção escolhida por necessidade e multiplica a quantidade", () => {
    const item = {
      ...newPurchase(),
      name: "Sofá",
      quantity: 2,
      estimate: 900,
      options: [1000, 1400].map((price) => ({
        id: crypto.randomUUID(),
        name: "Modelo",
        price,
        store: "",
        url: "",
        photos: [],
      })),
    };
    expect(itemTotal(item)).toBe(1800);
    item.selected = item.options[1].id;
    expect(itemTotal(item)).toBe(2800);
    item.options[1].price = null as unknown as number;
    expect(itemTotal(item)).toBeNull();
  });
  it("separa desejo, futuro, comprado e valor desconhecido", () => {
    const base = { ...newPurchase(), name: "Mesa", estimate: 100 };
    const b = budget([
      base,
      { ...base, purchased: true },
      { ...base, estimate: null },
      { ...base, priority: "Desejo" },
      { ...base, priority: "Depois" },
      { ...base, priority: "Já temos" },
    ]);
    expect(b.planned).toEqual({ known: 200, pending: 1 });
    expect(b.bought.known).toBe(100);
    expect(b.remaining).toEqual({ known: 100, pending: 1 });
    expect(b.future.known).toBe(100);
  });
  it("distribui centavos sem duplicação e respeita meses e prioridades", () => {
    const item = {
      ...newPurchase(),
      name: "Compra",
      estimate: 100,
      payment: "Parcelado" as const,
      installments: 3,
      firstMonth: "2026-12",
    };
    const flow = purchasesFlow(
      [item, { ...item, priority: "Desejo" }, { ...item, priority: "Depois" }],
      "2026-11",
    );
    expect(flow.months.slice(0, 5).map((m) => m.total)).toEqual([
      0, 33.34, 33.33, 33.33, 0,
    ]);
    expect(flow.months.reduce((s, m) => s + Math.round(m.total * 100), 0)).toBe(
      10000,
    );
  });
  it("rejeita vínculo inexistente e link inválido", () => {
    const item = {
      ...newPurchase(),
      name: "Teste",
      selected: crypto.randomUUID(),
    };
    expect(
      livingSchema.safeParse({ ...emptyLiving(), items: [item] }).success,
    ).toBe(false);
    expect(
      livingSchema.safeParse({
        ...emptyLiving(),
        inspirations: [
          {
            id: crypto.randomUUID(),
            collectionId: crypto.randomUUID(),
            itemId: null,
            title: "",
            url: "https://",
            notes: "",
            photos: [],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

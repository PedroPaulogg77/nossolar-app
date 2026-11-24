import { describe, it, expect } from "vitest";
import {
  newProperty,
  initialProperty,
  documentation,
  entry,
  cashflow,
  defaults,
  score,
  requirements,
  validateFinance,
  backupSchema,
  recurring,
} from "../lib/domain";
describe("Integridade financeira", () => {
  it("separa meses do sinal, parcelas, condomínio e IPTU", () => {
    const p = initialProperty();
    Object.assign(p.finance, {
      financed: 300000,
      fgts: 0,
      subsidy: 0,
      split: true,
      deposit: 10000,
      installments: 4,
      entryMonth: "2026-11",
      installmentMonth: "2027-01",
      condo: 200,
      condoMonth: "2026-12",
      iptu: 1200,
      iptuMonth: "2027-02",
    });
    const f = cashflow(p, "2026-11");
    expect(f.months[0].values[0]).toBe(10000);
    expect(f.months[0].values[1]).toBe(0);
    expect(f.months[2].values[1]).toBe(20000);
    expect(f.months[1].values[4]).toBe(200);
    expect(f.months[1].values[5]).toBe(0);
    expect(f.months[3].values[5]).toBe(100);
  });
  it("preserva exemplo real sem inventar financiamento", () => {
    const p = initialProperty();
    expect(documentation(p)).toBe(6000);
    expect(p.price! + documentation(p)!).toBe(396000);
    expect(entry(p)).toBeNull();
    expect(recurring(p)).toBeNull();
    expect(p.area).toBeNull();
  });
  it("modos substitutivos da documentação", () => {
    const p = initialProperty();
    p.finance.docMode = "estimate";
    expect(documentation(p)).toBe(23400);
    p.finance.docMode = "total";
    p.finance.docTotal = 5000;
    expect(documentation(p)).toBe(5000);
    p.finance.docMode = "detailed";
    p.finance.fees = null;
    expect(documentation(p)).toBeNull();
  });
  it("exige confirmação explícita de FGTS e subsídio", () => {
    const p = initialProperty();
    p.finance.financed = 300000;
    expect(entry(p)).toBeNull();
    p.finance.fgts = 0;
    p.finance.subsidy = 0;
    expect(entry(p)).toBe(90000);
  });
  it("sinal e parcelas sem dupla contagem com centavos exatos", () => {
    const p = initialProperty();
    Object.assign(p.finance, {
      financed: 300000,
      fgts: 0,
      subsidy: 0,
      split: true,
      deposit: 10000,
      installments: 3,
      entryMonth: "2026-12",
    });
    const f = cashflow(p, "2026-11");
    expect(f.months[0].total).toBe(0);
    expect(f.months[1].values[0]).toBe(10000);
    expect(f.months[1].values[1]).toBe(26666.67);
    expect(f.months.reduce((n, m) => n + m.total, 0)).toBe(90000);
  });
  it("respeita datas, itens únicos e sobreposição informada", () => {
    const p = initialProperty();
    p.type = "Em obra";
    Object.assign(p.finance, {
      construction: 500,
      constructionStart: "2026-12",
      constructionEnd: "2027-02",
      payment: 1000,
      paymentMonth: "2027-02",
      docMonth: "2026-12",
      condo: 300,
      condoMonth: "2027-03",
      iptu: 1200,
      extras: [{ id: "1", label: "Mudança", value: 2000, month: "2027-03" }],
    });
    const f = cashflow(p, "2026-12");
    expect(f.months[0].total).toBe(6500);
    expect(f.months[2].total).toBe(1500);
    expect(f.months[3].total).toBe(3400);
    expect(f.months[4].total).toBe(1400);
    p.type = "Pronto";
    expect(cashflow(p, "2026-12").months[0].values[2]).toBe(0);
  });
  it("não transforma pendências em notas zero ou vencedores", () => {
    const p = newProperty();
    p.ratings = [10, null, null, null, null];
    expect(score(p, defaults)).toEqual({
      complete: false,
      coverage: 30,
      value: null,
    });
    p.ratings = [10, 8, 6, 9, 7];
    expect(score(p, defaults).value).toBe(81);
  });
  it("requisitos só eliminam violações confirmadas", () => {
    const p = initialProperty();
    expect(requirements(p, { ...defaults, minRooms: 2 })).toBe("A verificar");
    p.rooms = 1;
    expect(requirements(p, { ...defaults, minRooms: 2 })).toBe(
      "Fora dos requisitos",
    );
  });
  it("rejeita financiamento impossível e backup inválido", () => {
    const p = initialProperty();
    p.finance.financed = 500000;
    expect(validateFinance(p)).not.toBeNull();
    expect(
      backupSchema.safeParse({
        version: 1,
        properties: [{}],
        preferences: defaults,
      }).success,
    ).toBe(false);
  });
});

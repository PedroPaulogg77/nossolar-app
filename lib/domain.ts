import { z } from "zod";
import { attachmentSchema, fileBackupSchema } from "./attachment-types";
const month = z.string().regex(/^$|^\d{4}-(0[1-9]|1[0-2])$/);
const amount = z.number().finite().nonnegative().nullable();
export const criteria = [
  "Financeiro",
  "Localização",
  "Planta e acabamento",
  "Condomínio",
  "Riscos",
] as const;
export const financeSchema = z.object({
  financed: amount,
  fgts: amount,
  subsidy: amount,
  cashEntry: amount.default(null),
  installmentTotal: amount.default(null),
  deposit: amount,
  installments: z.number().int().min(1).max(600),
  split: z.boolean(),
  entryMonth: month,
  installmentMonth: month.default(""),
  payment: amount,
  paymentMonth: month,
  condo: amount,
  condoMonth: month,
  iptuMonth: month.default(""),
  iptu: amount,
  docMode: z.enum(["estimate", "detailed", "total"]),
  itbi: amount,
  registry: amount,
  fees: amount,
  other: amount,
  docTotal: amount,
  docMonth: month,
  construction: amount,
  constructionStart: month,
  constructionEnd: month,
  extras: z.array(
    z.object({
      id: z.string(),
      label: z.string().min(1),
      value: z.number().nonnegative(),
      month: z.string(),
    }),
  ),
});
export const propertySchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  type: z.enum(["Pronto", "Em obra", "Na planta"]).nullable(),
  price: amount,
  area: amount,
  location: z.string().default(""),
  city: z.string().trim().max(120).default(""),
  neighborhood: z.string().trim().max(120).default(""),
  attachments: z.array(attachmentSchema).max(20).default([]),
  rooms: amount,
  baths: amount,
  suites: amount,
  parking: amount,
  address: z.string(),
  delivery: z.string(),
  floor: z.string(),
  sun: z.string(),
  balcony: z.boolean().nullable(),
  elevator: z.boolean().nullable(),
  url: z.string(),
  photo: z.string(),
  listingHighlights: z.string().max(2000).default(""),
  notes: z.string(),
  checklist: z.array(z.string()),
  status: z.enum(["Rascunho", "Em avaliação", "Visitado", "Descartado"]),
  favorite: z.boolean(),
  ratings: z.array(z.number().min(0).max(10).nullable()).length(5),
  finance: financeSchema,
});
export type Property = z.infer<typeof propertySchema>;
export type Finance = Property["finance"];
export const preferencesSchema = z.object({
  income: z.number().positive(),
  savings: amount.default(null),
  ceiling: z.number().positive(),
  minRooms: amount,
  minParking: amount,
  weights: z
    .array(z.number().min(0).max(100))
    .length(5)
    .refine(
      (v) => v.reduce((a, b) => a + b, 0) === 100,
      "Os pesos devem somar 100%.",
    ),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const backupSchema = z.object({
  version: z.literal(1),
  properties: z.array(propertySchema),
  preferences: preferencesSchema,
  files: fileBackupSchema.optional(),
});
export const defaults: Preferences = {
  income: 8000,
  savings: null,
  ceiling: 400000,
  minRooms: null,
  minParking: null,
  weights: [30, 25, 25, 10, 10],
};
export function newProperty(): Property {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: null,
    price: null,
    area: null,
    location: "",
    city: "",
    neighborhood: "",
    attachments: [],
    rooms: null,
    baths: null,
    suites: null,
    parking: null,
    address: "",
    delivery: "",
    floor: "",
    sun: "",
    balcony: null,
    elevator: null,
    url: "",
    photo: "",
    listingHighlights: "",
    notes: "",
    checklist: [],
    status: "Rascunho",
    favorite: false,
    ratings: [null, null, null, null, null],
    finance: {
      financed: null,
      fgts: null,
      subsidy: null,
      cashEntry: null,
      installmentTotal: null,
      deposit: null,
      installments: 12,
      split: false,
      entryMonth: "",
      installmentMonth: "",
      payment: null,
      paymentMonth: "",
      condo: null,
      condoMonth: "",
      iptuMonth: "",
      iptu: null,
      docMode: "estimate",
      itbi: null,
      registry: null,
      fees: null,
      other: null,
      docTotal: null,
      docMonth: "",
      construction: null,
      constructionStart: "",
      constructionEnd: "",
      extras: [],
    },
  };
}
export function initialProperty(): Property {
  const p = newProperty();
  return {
    ...p,
    name: "Cobertura em avaliação",
    price: 390000,
    status: "Em avaliação",
    finance: {
      ...p.finance,
      docMode: "detailed",
      itbi: 0,
      registry: 0,
      fees: 0,
      other: 6000,
    },
  };
}
export const money = (v: number | null) =>
  v === null
    ? "Não informado"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 2,
      }).format(v);
export const sumKnown = (values: (number | null)[]) =>
  values.some((v) => v === null)
    ? null
    : values.reduce<number>((a, v) => a + (v ?? 0), 0);
export function documentation(p: Property): number | null {
  const f = p.finance;
  return f.docMode === "estimate"
    ? p.price === null
      ? null
      : p.price * 0.06
    : f.docMode === "total"
      ? f.docTotal
      : sumKnown([f.itbi, f.registry, f.fees, f.other]);
}
export function entry(p: Property): number | null {
  const f = p.finance;
  if (f.cashEntry !== null) return f.cashEntry;
  if ([p.price, f.financed, f.fgts, f.subsidy].some((v) => v === null))
    return null;
  return Math.max(0, p.price! - f.financed! - f.fgts! - f.subsidy!);
}
export function entryParts(p: Property) {
  const total = entry(p),
    f = p.finance;
  if (total === null) return { upfront: null, installments: null };
  if (!f.split) return { upfront: total, installments: 0 };
  const installments =
    f.installmentTotal ?? (f.deposit === null ? null : total - f.deposit);
  return {
    upfront: installments === null ? null : total - installments,
    installments,
  };
}
export function acquisitionGap(p: Property, savings: number | null) {
  const parts = entryParts(p),
    doc = documentation(p);
  return savings === null || parts.upfront === null || doc === null
    ? null
    : Math.max(
        0,
        parts.upfront +
          doc +
          p.finance.extras.reduce((n, x) => n + x.value, 0) -
          savings,
      );
}
export function recurring(p: Property) {
  return sumKnown([
    p.finance.payment,
    p.finance.condo,
    p.finance.iptu === null ? null : p.finance.iptu / 12,
  ]);
}
export function score(p: Property, prefs: Preferences) {
  const complete = p.ratings.every(
    (n, i) => n !== null || prefs.weights[i] === 0,
  );
  return {
    complete,
    coverage: p.ratings.reduce<number>(
      (n, r, i) => n + (r === null ? 0 : prefs.weights[i]),
      0,
    ),
    value: complete
      ? p.ratings.reduce<number>(
          (n, r, i) => n + ((r ?? 0) * prefs.weights[i]) / 10,
          0,
        )
      : null,
  };
}
export function requirements(p: Property, prefs: Preferences) {
  const checks: [
    [number | null, number | null, "max" | "min"],
    ...[number | null, number | null, "max" | "min"][],
  ] = [
    [p.price, prefs.ceiling, "max"],
    [p.rooms, prefs.minRooms, "min"],
    [p.parking, prefs.minParking, "min"],
  ];
  if (
    checks.some(
      ([v, l, op]) =>
        v !== null && l !== null && (op === "max" ? v > l : v < l),
    )
  )
    return "Fora dos requisitos";
  if (checks.some(([v, l]) => l !== null && v === null)) return "A verificar";
  return "Dentro dos requisitos";
}
export function validateFinance(p: Property) {
  const f = p.finance,
    e = entry(p);
  if (
    p.price !== null &&
    f.financed !== null &&
    f.financed + (f.fgts ?? 0) + (f.subsidy ?? 0) > p.price
  )
    return "Financiamento, FGTS e subsídio excedem o preço.";
  if (e !== null && f.deposit !== null && f.deposit > e)
    return "O sinal não pode exceder a entrada em dinheiro.";
  if (e !== null && f.installmentTotal !== null && f.installmentTotal > e)
    return "A parte parcelada não pode exceder a entrada em dinheiro.";
  if (f.cashEntry !== null && p.price !== null && f.cashEntry > p.price)
    return "A entrada informada não pode exceder o preço do imóvel.";
  if (
    f.constructionStart &&
    f.constructionEnd &&
    f.constructionEnd < f.constructionStart
  )
    return "O fim da obra deve ser posterior ao início.";
  return null;
}
export const cashLabels = [
  "Sinal / entrada",
  "Parcelas da entrada",
  "Evolução de obra",
  "Prestação",
  "Condomínio",
  "IPTU equivalente",
  "Documentação",
  "Eventuais",
];
export function monthIndex(s: string) {
  const [y, m] = s.split("-").map(Number);
  return y * 12 + m - 1;
}
export function cashflow(p: Property, start: string, count = 12) {
  const f = p.finance,
    e = entry(p),
    doc = documentation(p);
  const pending: string[] = [];
  for (const [label, value, date] of [
    ["Entrada", e, f.entryMonth],
    ["Prestação", f.payment, f.paymentMonth],
    ["Condomínio", f.condo, f.condoMonth],
    ["IPTU", f.iptu, f.iptuMonth || f.condoMonth],
    ["Documentação", doc, f.docMonth],
  ] as const)
    if (value === null || (value > 0 && !date)) pending.push(label);
  const parts = entryParts(p);
  if (f.split && parts.installments === null)
    pending.push("Parte parcelada da entrada");
  if (f.extras.some((x) => !x.month)) pending.push("Mês dos gastos eventuais");
  if (
    p.type !== "Pronto" &&
    (f.construction === null ||
      (f.construction > 0 && (!f.constructionStart || !f.constructionEnd)))
  )
    pending.push("Evolução de obra");
  return {
    pending,
    months: Array.from({ length: count }, (_, i) => {
      const index = monthIndex(start) + i;
      const date = new Date(Math.floor(index / 12), index % 12, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const values = Array<number>(8).fill(0);
      if (f.entryMonth && e !== null) {
        const offset = index - monthIndex(f.entryMonth);
        if (offset === 0) values[0] = parts.upfront ?? 0;
        const installmentOffset =
          index - monthIndex(f.installmentMonth || f.entryMonth);
        if (
          f.split &&
          parts.installments !== null &&
          installmentOffset >= 0 &&
          installmentOffset < f.installments
        ) {
          const cents = Math.round(parts.installments * 100),
            base = Math.floor(cents / f.installments);
          values[1] =
            (base + (installmentOffset < cents % f.installments ? 1 : 0)) / 100;
        }
      }
      if (
        p.type !== null &&
        p.type !== "Pronto" &&
        f.constructionStart &&
        f.constructionEnd &&
        key >= f.constructionStart &&
        key <= f.constructionEnd
      )
        values[2] = f.construction ?? 0;
      if (f.paymentMonth && key >= f.paymentMonth) values[3] = f.payment ?? 0;
      if (f.condoMonth && key >= f.condoMonth) {
        values[4] = f.condo ?? 0;
      }
      const iptuStart = f.iptuMonth || f.condoMonth;
      if (iptuStart && key >= iptuStart) values[5] = (f.iptu ?? 0) / 12;
      if (key === f.docMonth) values[6] = doc ?? 0;
      values[7] = f.extras
        .filter((x) => x.month === key)
        .reduce((n, x) => n + x.value, 0);
      return {
        key,
        label:
          date
            .toLocaleDateString("pt-BR", { month: "short" })
            .replace(".", "") +
          "/" +
          String(date.getFullYear()).slice(-2),
        values,
        total: values.reduce((a, b) => a + b, 0),
      };
    }),
  };
}

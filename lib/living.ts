import { z } from "zod";
import { attachmentSchema } from "./attachment-types";
export const groups = [
  "Móveis e eletrodomésticos",
  "Utensílios",
  "Enxoval",
  "Supermercado",
  "Serviços",
] as const;
export const priorities = [
  "Para a mudança",
  "Depois",
  "Desejo",
  "Já temos",
  "Não comprar",
] as const;
export const rooms = [
  "Sala",
  "Cozinha",
  "Quarto",
  "Banheiro",
  "Lavanderia",
  "Escritório",
  "Geral",
];
const price = z.number().finite().nonnegative().max(1e9).nullable();
export const linkSchema = z
  .string()
  .max(2000)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return ["http:", "https:"].includes(u.protocol) && !!u.hostname;
    } catch {
      return false;
    }
  }, "Use um link http ou https válido.");
const photos = z.array(attachmentSchema).max(10);
export const optionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  store: z.string().max(200),
  url: linkSchema,
  price,
  photos,
});
export const itemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(10000),
    estimate: price,
    group: z.enum(groups),
    room: z.string().max(80),
    priority: z.enum(priorities),
    purchased: z.boolean(),
    notes: z.string().max(5000),
    options: z.array(optionSchema).max(30),
    selected: z.string().uuid().nullable(),
    photos,
    payment: z.enum(["À vista", "Parcelado"]),
    installments: z.number().int().min(1).max(120),
    firstMonth: z.string().regex(/^$|^\d{4}-(0[1-9]|1[0-2])$/),
  })
  .refine(
    (v) => !v.selected || v.options.some((o) => o.id === v.selected),
    "A opção escolhida não existe mais.",
  );
export const collectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
});
export const inspirationSchema = z
  .object({
    id: z.string().uuid(),
    collectionId: z.string().uuid(),
    title: z.string().max(200),
    url: linkSchema,
    notes: z.string().max(5000),
    itemId: z.string().uuid().nullable(),
    photos,
  })
  .refine((v) => v.url || v.photos.length, "Adicione uma foto ou um link.");
export const livingSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    futureReserve: price.default(null),
    items: z.array(itemSchema).max(500),
    collections: z.array(collectionSchema).max(100),
    inspirations: z.array(inspirationSchema).max(1000),
  })
  .refine(
    (v) =>
      v.inspirations.every(
        (r) =>
          v.collections.some((c) => c.id === r.collectionId) &&
          (!r.itemId || v.items.some((i) => i.id === r.itemId)),
      ),
    "Confira a coleção e o item associado às referências.",
  )
  .refine(
    (v) =>
      [
        ...v.items.flatMap((i) => [
          ...i.photos,
          ...i.options.flatMap((o) => o.photos),
        ]),
        ...v.inspirations.flatMap((r) => r.photos),
      ].reduce((s, f) => s + f.size, 0) <=
      100 * 1024 * 1024,
    "O espaço de fotos destas áreas chegou a 100 MB.",
  );
export type Living = z.infer<typeof livingSchema>;
export type Purchase = z.infer<typeof itemSchema>;
export type Inspiration = z.infer<typeof inspirationSchema>;
export const emptyLiving = (): Living => ({
  revision: 0,
  futureReserve: null,
  items: [],
  collections: [],
  inspirations: [],
});
export const newPurchase = (): Purchase => ({
  id: crypto.randomUUID(),
  name: "",
  quantity: 1,
  estimate: null,
  group: groups[0],
  room: "",
  priority: "Para a mudança",
  purchased: false,
  notes: "",
  options: [],
  selected: null,
  photos: [],
  payment: "À vista",
  installments: 1,
  firstMonth: "",
});
export function itemTotal(item: Purchase): number | null {
  const unit = item.selected
    ? (item.options.find((o) => o.id === item.selected)?.price ?? null)
    : item.estimate;
  return unit === null ? null : Math.round(unit * item.quantity * 100) / 100;
}
export function budget(items: Purchase[]) {
  const summarize = (list: Purchase[]) => ({
    known: list.reduce((s, i) => s + (itemTotal(i) ?? 0), 0),
    pending: list.filter((i) => itemTotal(i) === null).length,
  });
  const immediate = items.filter((i) => i.priority === "Para a mudança");
  return {
    planned: summarize(immediate),
    bought: summarize(immediate.filter((i) => i.purchased)),
    remaining: summarize(immediate.filter((i) => !i.purchased)),
    future: summarize(items.filter((i) => i.priority === "Depois")),
    upfront: summarize(immediate.filter((i) => i.payment === "À vista")),
  };
}
export function purchasesFlow(items: Purchase[], start: string) {
  const planned = items.filter((i) => i.priority === "Para a mudança");
  const index = (date: string) =>
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5)) - 1;
  const startIndex = index(start);
  return {
    pending: planned
      .filter((i) => itemTotal(i) === null || !i.firstMonth)
      .map((i) => i.name),
    months: Array.from({ length: 12 }, (_, offset) => {
      const n = startIndex + offset;
      const key = `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
      let cents = 0;
      for (const item of planned) {
        const total = itemTotal(item);
        if (total === null || !item.firstMonth) continue;
        const count = item.payment === "Parcelado" ? item.installments : 1;
        const delta = n - index(item.firstMonth);
        if (delta >= 0 && delta < count) {
          const totalCents = Math.round(total * 100),
            base = Math.floor(totalCents / count);
          cents += base + (delta < totalCents % count ? 1 : 0);
        }
      }
      return { key, total: cents / 100 };
    }),
  };
}

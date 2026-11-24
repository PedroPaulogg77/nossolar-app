import { newProperty, type Property } from "./domain";

export type AiField = {
  valor: string | number | boolean | null;
  origem: string;
  confianca: string;
};
export type AiPreview = Record<string, AiField>;

function number(value: AiField["valor"] | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number")
    return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const clean = value.replace(/[^\d,.-]/g, "");
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function boolean(value: AiField["valor"] | undefined) {
  if (value === true || value === "Sim" || value === "sim" || value === "true")
    return true;
  if (
    value === false ||
    value === "Não" ||
    value === "não" ||
    value === "false"
  )
    return false;
  return null;
}

export function propertyFromAi(fields: AiPreview): Property {
  const property = newProperty();
  property.name = String(fields.name?.valor ?? "Imóvel importado");
  property.listingHighlights = String(fields.highlights?.valor ?? "").slice(
    0,
    2000,
  );
  for (const key of [
    "city",
    "neighborhood",
    "address",
    "floor",
    "sun",
  ] as const)
    property[key] = String(fields[key]?.valor ?? "");
  const type = fields.type?.valor;
  if (type === "Pronto" || type === "Em obra" || type === "Na planta")
    property.type = type;
  const delivery = String(fields.delivery?.valor ?? "");
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(delivery)) property.delivery = delivery;
  for (const key of [
    "price",
    "area",
    "rooms",
    "baths",
    "suites",
    "parking",
  ] as const)
    property[key] = number(fields[key]?.valor);
  property.balcony = boolean(fields.balcony?.valor);
  property.elevator = boolean(fields.elevator?.valor);
  for (const key of [
    "condo",
    "iptu",
    "cashEntry",
    "installmentTotal",
    "payment",
  ] as const)
    property.finance[key] = number(fields[key]?.valor);
  const installments = number(fields.installments?.valor);
  if (
    installments !== null &&
    Number.isInteger(installments) &&
    installments >= 1 &&
    installments <= 600
  )
    property.finance.installments = installments;
  if (property.finance.installmentTotal !== null) property.finance.split = true;
  return property;
}

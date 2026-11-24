import type { Property } from "./domain";
export const locationKey = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export const propertyLocation = (p: Property) =>
  [p.neighborhood, p.city].filter(Boolean).join(" · ") ||
  p.location ||
  "Localização a confirmar";
export function locationOptions(
  properties: Property[],
  field: "city" | "neighborhood",
  city = "",
) {
  const values = new Map<string, string>();
  for (const p of properties) {
    if (city && locationKey(p.city) !== city) continue;
    const value = p[field].trim();
    if (value && !values.has(locationKey(value)))
      values.set(locationKey(value), value);
  }
  return [...values].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
}
export function matchesLocation(
  p: Property,
  city: string,
  neighborhood: string,
) {
  return (
    (!city || locationKey(p.city) === city) &&
    (!neighborhood || locationKey(p.neighborhood) === neighborhood)
  );
}

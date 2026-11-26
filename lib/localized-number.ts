export function parseLocalizedNumber(value: string): number | null | undefined {
  const compact = value
    .trim()
    .replace(/r\$/gi, "")
    .replace(/\s/g, "")
    .replace(/[^\d.,+-]/g, "");
  if (!compact) return value.trim() ? undefined : null;
  if (!/^[+-]?(?:\d+|\d{1,3}(?:[.,]\d{3})+)(?:[.,]\d+)?$/.test(compact))
    return undefined;

  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    normalized = compact.replace(thousands, "");
    if (decimal === ",") normalized = normalized.replace(",", ".");
  } else if (comma >= 0) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else if (dot >= 0) {
    const isThousands = /^\d{1,3}(?:\.\d{3})+$/.test(compact);
    normalized = isThousands ? compact.replace(/\./g, "") : compact;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

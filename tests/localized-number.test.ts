import { describe, expect, it } from "vitest";
import { parseLocalizedNumber } from "../lib/localized-number";

describe("parseLocalizedNumber", () => {
  it.each([
    ["3.299,90", 3299.9],
    ["R$ 3.299,90", 3299.9],
    ["3299,90", 3299.9],
    ["3,299.90", 3299.9],
    ["1.234.567", 1234567],
    ["90", 90],
  ])("interprets %s as %s", (raw, expected) => {
    expect(parseLocalizedNumber(raw)).toBe(expected);
  });

  it("distinguishes an empty price from invalid text", () => {
    expect(parseLocalizedNumber("")).toBeNull();
    expect(parseLocalizedNumber("preço a combinar")).toBeUndefined();
  });
});

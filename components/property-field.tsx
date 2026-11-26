"use client";

import { CurrencyInput } from "@/components/currency-input";
import { parseLocalizedNumber } from "@/lib/localized-number";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string | number | null;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  if (type === "month") {
    const current = String(value ?? "");
    const [year, month] = current.split("-");
    const years = Array.from({ length: 31 }, (_, i) => 2024 + i);
    return (
      <div className="field">
        <span>{label}</span>
        <div className="month-pickers">
          <select
            aria-label={`${label}: mês`}
            value={month ?? ""}
            onChange={(e) =>
              onChange(
                e.target.value
                  ? `${year || new Date().getFullYear()}-${e.target.value}`
                  : "",
              )
            }
          >
            <option value="">Mês</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>
                {new Date(2024, i, 1).toLocaleDateString("pt-BR", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
          <select
            aria-label={`${label}: ano`}
            value={year ?? ""}
            onChange={(e) =>
              onChange(
                e.target.value ? `${e.target.value}-${month || "01"}` : "",
              )
            }
          >
            <option value="">Ano</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }
  if (type === "currency") {
    const raw = String(value ?? "");
    return (
      <label className="field">
        <span>{label}</span>
        <CurrencyInput
          value={parseLocalizedNumber(raw) ?? null}
          onChange={(v) => onChange(v === null ? "" : String(v))}
          placeholder="0,00"
        />
      </label>
    );
  }
  return (
    <label className="field">
      <span>{label}</span>
      <input
        {...rest}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={type === "number" ? "Não informado" : ""}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
}

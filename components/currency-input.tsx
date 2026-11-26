"use client";

import { useEffect, useState } from "react";
import { parseLocalizedNumber } from "@/lib/localized-number";

function format(value: number | null) {
  return value === null
    ? ""
    : new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
}

export function CurrencyInput({
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: (value: number | null) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(format(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(format(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        const parsed = parseLocalizedNumber(raw);
        if (parsed !== undefined) onChange(parsed);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseLocalizedNumber(draft);
        if (parsed !== undefined) {
          setDraft(format(parsed));
          onChange(parsed);
          onBlur?.(parsed);
        } else {
          setDraft(format(value));
        }
      }}
    />
  );
}

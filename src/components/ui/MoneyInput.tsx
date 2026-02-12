import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onValueChange: (next: number) => void;
  withSymbol?: boolean;
  allowNegative?: boolean;
  emptyAsZero?: boolean;
};

function clampToMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function formatMoneyPtBr(n: number, withSymbol: boolean) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const formatted = withSymbol
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)
    : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  return `${sign}${formatted}`;
}

function digitsToMoney(digits: string) {
  const clean = digits.replace(/\D/g, "");
  const cents = clean ? Number(clean) : 0;
  return cents / 100;
}

function moneyToDigits(value: number) {
  const cents = Math.round(Math.abs(value) * 100);
  return String(cents);
}

export function MoneyInput({
  value,
  onValueChange,
  withSymbol = false,
  allowNegative = false,
  emptyAsZero = true,
  inputMode = "numeric",
  ...rest
}: Props) {
  const [raw, setRaw] = useState(() => (value == null ? "" : moneyToDigits(value)));
  const lastPropRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const v = value == null ? null : clampToMoney(value);
    if (v === lastPropRef.current) return;
    lastPropRef.current = v;
    setRaw(v == null ? "" : moneyToDigits(v));
  }, [value]);

  const display = useMemo(() => {
    if (!raw) return emptyAsZero ? formatMoneyPtBr(0, withSymbol) : "";
    const n = digitsToMoney(raw);
    const sign = allowNegative && value != null && value < 0 ? -1 : 1;
    return formatMoneyPtBr(sign * n, withSymbol);
  }, [allowNegative, emptyAsZero, raw, value, withSymbol]);

  return (
    <Input
      {...rest}
      ref={(el) => {
        inputRef.current = el;
      }}
      inputMode={inputMode}
      value={display}
      onChange={(e) => {
        const text = e.target.value;
        const negative = allowNegative && /^\s*-/.test(text);
        const digits = text.replace(/\D/g, "");
        setRaw(digits);
        const next = clampToMoney(digitsToMoney(digits)) * (negative ? -1 : 1);
        onValueChange(next);
      }}
    />
  );
}


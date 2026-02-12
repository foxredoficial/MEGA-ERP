import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function toLocalIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function splitSeedText(input: string | null | undefined) {
  const raw = input ?? "";
  if (!raw) return { raw, seed: null as string | null, text: "" };
  const parts = raw.split("::");
  if (parts.length >= 3 && parts[0] === "SEED") {
    return {
      raw,
      seed: parts[1] ?? null,
      text: parts.slice(2).join("::") || raw,
    };
  }
  return { raw, seed: null as string | null, text: raw };
}

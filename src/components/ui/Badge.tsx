import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: "blue" | "green" | "slate" | "red";
  variant?: string;
};

function resolveTone(input: Props["tone"], variant?: string): Props["tone"] {
  if (!variant) return input;

  if (variant === "blue" || variant === "green" || variant === "slate" || variant === "red") {
    return variant;
  }

  if (variant === "success") return "green";
  if (variant === "danger" || variant === "error") return "red";
  if (variant === "info") return "blue";
  if (variant === "default" || variant === "neutral") return "slate";

  return input;
}

export function Badge({ className, tone = "slate", variant, ...props }: Props) {
  const resolvedTone = resolveTone(tone, variant);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        resolvedTone === "slate" && "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
        resolvedTone === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
        resolvedTone === "green" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        resolvedTone === "red" && "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
        className
      )}
      {...props}
    />
  );
}

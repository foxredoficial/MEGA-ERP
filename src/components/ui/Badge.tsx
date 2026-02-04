import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: "blue" | "green" | "zinc" | "red";
};

export function Badge({ className, tone = "zinc", ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "zinc" && "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        tone === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
        tone === "green" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        tone === "red" && "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
        className
      )}
      {...props}
    />
  );
}


import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60",
        size === "md" ? "h-11 px-4 text-sm" : size === "sm" ? "h-9 px-3 text-sm" : size === "icon" ? "h-9 w-9 p-0" : "h-12 px-6 text-base",
        variant === "primary" &&
          "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400",
        (variant === "secondary" || variant === "outline") &&
          "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
        className
      )}
      {...props}
    />
  );
}


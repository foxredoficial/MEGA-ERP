import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}


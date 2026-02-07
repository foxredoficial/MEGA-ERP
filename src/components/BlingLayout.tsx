import { ReactNode } from "react";
import { BlingHeader } from "./BlingHeader";

interface BlingLayoutProps {
  children: ReactNode;
}

export function BlingLayout({ children }: BlingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-slate-950">
      <BlingHeader />
      <main className="pt-20 pb-12 px-4 md:px-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}

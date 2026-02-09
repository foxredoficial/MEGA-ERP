import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { 
  Shield, 
  AlertCircle, 
  
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { BlingLayout } from "@/components/BlingLayout";
import { SettingsPage } from "@/pages/Settings/SettingsPage";
import { DashboardView } from "@/pages/Dashboard/DashboardView";

type Section = "overview" | "profile" | "security" | "plan" | "settings";

function getSectionFromHash(hash: string): Section {
  const h = hash.replace("#", "").split("?")[0];
  if (h === "profile" || h === "plan" || h === "overview" || h === "security" || h === "settings") return h;
  return "overview";
}

export default function CustomerApp() {
  const initAuth = useAuthStore((s) => s.init);

  const location = useLocation();

  const [section, setSection] = useState<Section>(() => getSectionFromHash(location.hash));
  
  // Feedback global
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSection(getSectionFromHash(location.hash));

    const hash = location.hash;
    if (hash.includes("?")) {
      const query = hash.split("?")[1];
      const params = new URLSearchParams(query);
      const error = params.get("error");
      const success = params.get("success");

      if (error === "google_in_use") {
        setGlobalError("Esta conta Google já está vinculada a outro usuário.");
      } else if (error === "link_failed_session") {
        setGlobalError("Sessão expirou. Faça login novamente antes de vincular.");
      } else if (error === "google_linked") {
        setGlobalError("Erro ao vincular conta.");
      }

      if (success === "google_linked") {
        setGlobalSuccess("Conta Google vinculada com sucesso!");
        void initAuth();
      }

      const nextSection = getSectionFromHash(hash);
      window.history.replaceState(null, "", window.location.pathname + "#" + nextSection);
    }
  }, [initAuth, location.hash]);

  useEffect(() => {
    if (globalError || globalSuccess) {
      const timer = setTimeout(() => {
        setGlobalError(null);
        setGlobalSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [globalError, globalSuccess]);

  return (
    <BlingLayout>
      {/* Global Feedback */}
      {(globalError || globalSuccess) && (
        <div className={cn(
          "mb-6 p-4 rounded-lg shadow-sm flex items-center gap-3",
          globalError ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        )}>
          {globalError ? <AlertCircle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          <p className="font-medium">{globalError || globalSuccess}</p>
        </div>
      )}

      {section === "overview" && (
        <div className="animate-in fade-in duration-300">
          <DashboardView />
        </div>
      )}

      {section === "settings" && <SettingsPage defaultTab="company" />}
      {section === "profile" && <SettingsPage defaultTab="profile" />}
      {section === "security" && <SettingsPage defaultTab="security" />}
      {section === "plan" && <SettingsPage defaultTab="subscription" />}
    </BlingLayout>
  );
}

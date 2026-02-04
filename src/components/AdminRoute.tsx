import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ReactNode } from "react";

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const session = useAuthStore((s) => s.session);
  const status = useAuthStore((s) => s.status);

  if (status === "loading") {
    return <div>Carregando...</div>; // Or a better spinner
  }

  if (status !== "signedIn" || !session) {
    return <Navigate to="/auth" replace />;
  }

  if (session.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

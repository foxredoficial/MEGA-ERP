import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function PublicRoute({ children, allowSignedIn = false }: { children: React.ReactNode; allowSignedIn?: boolean }) {
  const { status } = useAuthStore();

  if (!allowSignedIn && status === "signedIn") {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

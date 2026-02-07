import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuthStore();

  if (status === "signedIn") {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

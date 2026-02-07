import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";

export function useAuthInit() {
  const init = useAuthStore((s) => s.init);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void init();
  }, [init]);
}

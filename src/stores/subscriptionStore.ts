import { create } from "zustand";
import { getMySubscription, type ApiError, type Subscription } from "@/lib/api";

type SubscriptionStatus = "idle" | "loading" | "ready" | "error";

type SubscriptionState = {
  status: SubscriptionStatus;
  subscription: Subscription | null;
  error: string | null;
  load: () => Promise<void>;
  clear: () => void;
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  status: "idle",
  subscription: null,
  error: null,
  load: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const { subscription } = await getMySubscription();
      set({ status: "ready", subscription: subscription ?? null, error: null });
    } catch (e) {
      const err = e as Partial<ApiError> | null;
      set({ status: "error", subscription: null, error: err?.message ?? "Não foi possível carregar sua assinatura." });
    }
  },
  clear: () => set({ status: "idle", subscription: null, error: null }),
}));


import { create } from "zustand";

type PlanState = {
  selectedPlanId: string | null;
  setSelectedPlanId: (planId: string | null) => void;
};

const storageKey = "megaerp:selectedPlanId";

function loadSelectedPlanId() {
  const raw = localStorage.getItem(storageKey);
  return raw ? raw : null;
}

export const usePlanStore = create<PlanState>((set) => ({
  selectedPlanId: loadSelectedPlanId(),
  setSelectedPlanId: (planId) => {
    if (planId) localStorage.setItem(storageKey, planId);
    else localStorage.removeItem(storageKey);
    set({ selectedPlanId: planId });
  },
}));

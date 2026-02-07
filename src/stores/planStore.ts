import { create } from "zustand";

type PlanState = {
  selectedPlanId: string | null;
  setSelectedPlanId: (planId: string | null) => void;
};

export const usePlanStore = create<PlanState>((set) => ({
  selectedPlanId: null,
  setSelectedPlanId: (planId) => set({ selectedPlanId: planId }),
}));

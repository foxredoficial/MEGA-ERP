import { create } from "zustand";
import { getMe, login, logout, register, requestPasswordResetWithDevLink, resetPassword, updateProfile, type ApiError } from "@/lib/api";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

export type AuthSession = {
  userId: string;
  email: string;
  role: 'user' | 'admin';
};

export type UserProfile = {
  fullName: string;
  companyName: string | null;
  document: string | null;
  phone: string | null;
  addressZip: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressComplement: string | null;
  // Novos
  personType: 'fisica' | 'juridica' | null;
  ie: string | null;
  im: string | null;
  cnae: string | null;
  taxRegime: string | null;
  mobile: string | null;
  emailBilling: string | null;
  website: string | null;
};

export type UserAuthDetails = {
  hasPassword: boolean;
  googleId: string | null;
};

export type UserPreferences = {
  theme?: 'light' | 'dark';
  fiscal?: {
    environment?: 'homolog' | 'prod';
  };
  [key: string]: any;
};

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
  profile: UserProfile | null;
  authDetails: UserAuthDetails | null;
  preferences: UserPreferences | null;
  error: string | null;
  init: () => Promise<void>;
  signUp: (args: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    planId?: string | null;
  }) => Promise<boolean>;
  signIn: (args: { email: string; password: string }) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; devResetUrl?: string }>;
  resetPassword: (args: { token: string; newPassword: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  profile: null,
  authDetails: null,
  preferences: null,
  error: null,

  init: async () => {
    set({ status: "loading", error: null });
    try {
      const me = await getMe();

      if (!me.authenticated) {
        set({ status: "signedOut", session: null, profile: null, authDetails: null, preferences: null });
        return;
      }

      set({
        status: "signedIn",
        session: { userId: me.user.id, email: me.user.email, role: me.user.role },
        profile: me.profile,
        authDetails: me.auth,
        preferences: me.preferences ?? {},
      });
    } catch (e) {
      const err = e as Partial<ApiError> | null;
      set({ status: "signedOut", session: null, profile: null, authDetails: null, preferences: null, error: err?.message ?? "Não foi possível carregar sua sessão." });
    }
  },

  signUp: async ({ email, password, fullName, companyName, planId }) => {
    set({ error: null });
    try {
      const me = await register({
        email,
        password,
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        planId: planId ?? null,
      });
      set({
        status: "signedIn",
        session: { userId: me.user.id, email: me.user.email, role: me.user.role },
        profile: me.profile,
        authDetails: me.auth,
        preferences: me.preferences ?? {},
      });
      return true;
    } catch (e) {
      const err = e as Partial<ApiError> | null;
      set({ error: err?.message ?? "Não foi possível criar a conta." });
      return false;
    }
  },

  signIn: async ({ email, password }) => {
    set({ error: null });
    try {
      const me = await login({ email, password });
      set({
        status: "signedIn",
        session: { userId: me.user.id, email: me.user.email, role: me.user.role },
        profile: me.profile,
        authDetails: me.auth,
        preferences: me.preferences ?? {},
      });
      return true;
    } catch (e) {
      const err = e as Partial<ApiError> | null;
      set({ error: err?.message ?? "Não foi possível autenticar." });
      return false;
    }
  },

  requestPasswordReset: async (email) => {
    set({ error: null });
    try {
      const res = await requestPasswordResetWithDevLink({ email });
      return { ok: true, devResetUrl: res.devResetUrl };
    } catch (e) {
      const err = e as Partial<ApiError> | null;
      set({ error: err?.message ?? "Não foi possível enviar o link de recuperação." });
      return { ok: false };
    }
  },

  resetPassword: async ({ token, newPassword }) => {
    set({ error: null });
    try {
      await resetPassword({ token, newPassword });
      return true;
    } catch (e) {
      const err = e as Partial<ApiError> | null;
      set({ error: err?.message ?? "Não foi possível redefinir a senha." });
      return false;
    }
  },

  signOut: async () => {
    set({ error: null });
    try {
      await logout();
    } catch (e) {
      void e;
    }
    set({ status: "signedOut", session: null, profile: null, preferences: null });
  },

  updateProfile: async (patch) => {
    const current = get().profile ?? { 
      fullName: "", 
      companyName: null, 
      document: null, 
      phone: null, 
      addressZip: null, 
      addressStreet: null, 
      addressNumber: null, 
      addressNeighborhood: null, 
      addressCity: null, 
      addressState: null, 
      addressComplement: null,
      personType: null,
      ie: null,
      im: null,
      cnae: null,
      taxRegime: null,
      mobile: null,
      emailBilling: null,
      website: null,
    };
    const next: UserProfile = {
      ...current,
      ...patch,
    };

    set({ profile: next, error: null });
    try {
      const result = await updateProfile({
        fullName: next.fullName,
        companyName: next.companyName,
        document: next.document,
        phone: next.phone,
        addressZip: next.addressZip,
        addressStreet: next.addressStreet,
        addressNumber: next.addressNumber,
        addressNeighborhood: next.addressNeighborhood,
        addressCity: next.addressCity,
        addressState: next.addressState,
        addressComplement: next.addressComplement,
        personType: next.personType,
        ie: next.ie,
        im: next.im,
        cnae: next.cnae,
        taxRegime: next.taxRegime,
        mobile: next.mobile,
        emailBilling: next.emailBilling,
        website: next.website,
      });
      set({
        profile: result.profile,
      });
    } catch (e) {
      const err = e as Partial<ApiError> | null;
      set({ error: err?.message ?? "Não foi possível salvar o perfil." });
    }
  },

  updatePreferences: async (patch) => {
    const current = get().preferences ?? {};
    const next = { ...current, ...patch };
    set({ preferences: next });
    try {
      // Import dynamically to avoid cycle if needed, but api.ts is fine
      const { updatePreferences } = await import('@/lib/api');
      await updatePreferences(patch);
    } catch (e) {
       console.error("Failed to sync preferences", e);
    }
  },
}));

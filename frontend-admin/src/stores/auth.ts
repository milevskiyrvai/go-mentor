import { create } from "zustand";
import type { AuthUser, Role } from "@/api/types";

interface AuthState {
  user: AuthUser | null;
  roles: Role[];
  selectedRole: Role | null;
  isHydrated: boolean;
  setSession: (user: AuthUser | null, roles: Role[], selected: Role | null) => void;
  setHydrated: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  roles: [],
  selectedRole: null,
  isHydrated: false,
  setSession: (user, roles, selected) =>
    set({ user, roles, selectedRole: selected }),
  setHydrated: (v) => set({ isHydrated: v }),
  clear: () => set({ user: null, roles: [], selectedRole: null }),
}));

import { create } from "zustand";
import type { Role, User } from "@/api/types";

interface AuthState {
  user: User | null;
  roles: Role[];
  selectedRole: Role | null;
  loaded: boolean;
  set: (data: Partial<Omit<AuthState, "set" | "reset">>) => void;
  reset: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  roles: [],
  selectedRole: null,
  loaded: false,
  set: (data) => set(data),
  reset: () => set({ user: null, roles: [], selectedRole: null, loaded: true }),
}));

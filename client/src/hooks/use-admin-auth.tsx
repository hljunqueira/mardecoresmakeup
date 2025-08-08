import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminAuthStore {
  isAuthenticated: boolean;
  user: { id: string; username: string } | null;
  login: (user: { id: string; username: string }) => void;
  logout: () => void;
}

export const useAdminAuth = create<AdminAuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (user) => set({ isAuthenticated: true, user }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: "admin-auth",
    }
  )
);

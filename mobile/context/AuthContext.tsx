import React, { createContext, useContext, useState, useEffect } from "react";
import { getToken, saveToken, saveUserProfile, getUserProfile, clearAuthStorage } from "@/lib/storage";
import { api } from "@/lib/api";
import { registerForPushNotificationsAsync } from "@/lib/notifications";

export interface StudentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  studentType?: string;
  university?: string;
  gradYear?: string;
  isOnboarded?: boolean;
  isPro?: boolean;
  currentStreakDays?: number;
  dailyQuestionGoal?: number;
  avatar?: string;
}

interface AuthContextType {
  user: StudentUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (payload: {
    fullName: string;
    email: string;
    password?: string;
    studentType?: string;
    university?: string;
    gradYear?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    try {
      const storedToken = await getToken();
      const cachedProfile = await getUserProfile();

      if (storedToken) {
        setToken(storedToken);
        if (cachedProfile) {
          setUser(cachedProfile);
        }

        // Verify session validity with backend
        try {
          const [res, schedRes] = await Promise.all([
            api.get<{ success: boolean; user: StudentUser }>("/api/user/me"),
            api.get<{ success: boolean; schedule: { currentStreakDays?: number } }>("/api/user/schedule").catch(() => null),
          ]);
          if (res?.success && res.user) {
            const merged: StudentUser = {
              ...res.user,
              avatar: res.user.avatar || cachedProfile?.avatar || "",
              currentStreakDays:
                schedRes?.schedule?.currentStreakDays ??
                res.user.currentStreakDays ??
                cachedProfile?.currentStreakDays ??
                0,
            };
            setUser(merged);
            await saveUserProfile(merged);
            registerForPushNotificationsAsync().catch(() => {});
          }
        } catch (err) {
          // If 401 or token expired, clear state
          console.warn("Session check failed or expired:", err);
          await clearAuthStorage();
          setToken(null);
          setUser(null);
        }
      }
    } catch (e) {
      console.error("Auth initialization error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    const res = await api.post("/api/login", { email, password });
    if (res?.token && res?.user) {
      await saveToken(res.token);
      let userData: StudentUser = res.user;

      // Sync with /api/user/me and /api/user/schedule (which holds the live streak on production)
      try {
        const [meRes, schedRes] = await Promise.all([
          api.get<{ success: boolean; user: StudentUser }>("/api/user/me", {
            headers: { Authorization: `Bearer ${res.token}` },
          }).catch(() => null),
          api.get<{ success: boolean; schedule: { currentStreakDays?: number } }>("/api/user/schedule", {
            headers: { Authorization: `Bearer ${res.token}` },
          }).catch(() => null),
        ]);

        if (meRes?.success && meRes.user) {
          userData = {
            ...userData,
            ...meRes.user,
            avatar: meRes.user.avatar || userData.avatar || "",
            currentStreakDays:
              schedRes?.schedule?.currentStreakDays ??
              meRes.user.currentStreakDays ??
              userData.currentStreakDays ??
              0,
          };
        } else if (schedRes?.schedule?.currentStreakDays !== undefined) {
          userData.currentStreakDays = schedRes.schedule.currentStreakDays;
        }
      } catch (meErr) {
        console.warn("Post-login sync from /api/user/me note:", meErr);
      }

      await saveUserProfile(userData);
      setToken(res.token);
      setUser(userData);
      registerForPushNotificationsAsync().catch(() => {});
    } else {
      throw new Error(res?.error || "Login response did not return an authentication token.");
    }
  };

  const signup = async (payload: {
    fullName: string;
    email: string;
    password?: string;
    studentType?: string;
    university?: string;
    gradYear?: string;
  }) => {
    const res = await api.post("/api/signup", payload);
    if (res?.token && res?.user) {
      await saveToken(res.token);
      await saveUserProfile(res.user);
      setToken(res.token);
      setUser(res.user);
      registerForPushNotificationsAsync().catch(() => {});
    } else {
      throw new Error(res?.error || "Signup response did not return an authentication token.");
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/logout", {}).catch(() => {});
    } finally {
      await clearAuthStorage();
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const [res, schedRes] = await Promise.all([
        api.get<{ success: boolean; user: StudentUser }>("/api/user/me"),
        api.get<{ success: boolean; schedule: { currentStreakDays?: number } }>("/api/user/schedule").catch(() => null),
      ]);
      if (res?.success && res.user) {
        const merged: StudentUser = {
          ...res.user,
          avatar: res.user.avatar || user?.avatar || "",
          currentStreakDays:
            schedRes?.schedule?.currentStreakDays ??
            res.user.currentStreakDays ??
            user?.currentStreakDays ??
            0,
        };
        setUser(merged);
        await saveUserProfile(merged);
      }
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  };

  const updateUserAvatar = async (avatarUrl: string) => {
    if (user) {
      const updated = { ...user, avatar: avatarUrl };
      setUser(updated);
      await saveUserProfile(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        logout,
        refreshUser,
        updateUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

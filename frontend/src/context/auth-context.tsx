"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, Language } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone_number: string;
    bank_name: string;
    preferred_language?: Language;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => { },
  updateProfile: async () => ({ success: false }),
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("goldenhour_token");
        const storedUser = localStorage.getItem("goldenhour_user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setToken(data.session.access_token);
            // Fetch profile
            const profileRes = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${data.session.access_token}` },
            });
            if (profileRes.ok) {
              const resJson = await profileRes.json();
              if (resJson.data) {
                setUser(resJson.data);
                localStorage.setItem("goldenhour_user", JSON.stringify(resJson.data));
              }
            }
          } else {
            setDemoSession();
          }
        } else {
          setDemoSession();
        }
      } catch (err) {
        console.error("Auth restore error:", err);
        setDemoSession();
      } finally {
        setIsLoading(false);
      }
    };

    const setDemoSession = () => {
      const demoUser: UserProfile = {
        id: "user_demo_772",
        email: "victim.demo@goldenhour.in",
        full_name: "Vikramaditya Sharma",
        phone_number: "+919876543210",
        bank_name: "Axis Bank",
        preferred_language: "en",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_notifications: true,
        sms_notifications: true,
      };
      const demoToken = "gh_demo_session_token";
      setUser(demoUser);
      setToken(demoToken);
      try {
        localStorage.setItem("goldenhour_token", demoToken);
        localStorage.setItem("goldenhour_user", JSON.stringify(demoUser));
      } catch (e) {}
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Supabase Auth if configured
      if (isSupabaseConfigured && supabase) {
        const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (supaErr) throw new Error(supaErr.message);
        if (supaData.session) {
          setToken(supaData.session.access_token);
          localStorage.setItem("goldenhour_token", supaData.session.access_token);
        }
      }

      // 2. Call FastAPI backend auth endpoint
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.detail || resData.error?.message || "Invalid email or password.");
      }

      const loggedUser = resData.data.user;
      const accessToken = resData.data.access_token;

      setUser(loggedUser);
      setToken(accessToken);
      localStorage.setItem("goldenhour_token", accessToken);
      localStorage.setItem("goldenhour_user", JSON.stringify(loggedUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign in." };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    phone_number: string;
    bank_name: string;
    preferred_language?: Language;
  }) => {
    setIsLoading(true);
    try {
      // 1. Supabase Auth signup if configured
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
              phone_number: data.phone_number,
              bank_name: data.bank_name,
              preferred_language: data.preferred_language || "en",
            },
          },
        });
      }

      // 2. FastAPI backend registration
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone_number: data.phone_number,
          bank_name: data.bank_name,
          preferred_language: data.preferred_language || "en",
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.detail || resData.error?.message || "Registration failed.");
      }

      // Auto login after registration
      return await login(data.email, data.password);
    } catch (err: any) {
      return { success: false, error: err.message || "Registration error." };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setToken(null);
      localStorage.removeItem("goldenhour_token");
      localStorage.removeItem("goldenhour_user");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.detail || "Failed to update profile.");
      }

      const updatedUser = resData.data;
      setUser(updatedUser);
      localStorage.setItem("goldenhour_user", JSON.stringify(updatedUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Profile update error" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

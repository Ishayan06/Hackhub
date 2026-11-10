"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("hm_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await api("/auth/me");
      setUser(user);
    } catch {
      localStorage.removeItem("hm_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const authenticate = async (path, payload) => {
    const { token, user } = await api(path, { method: "POST", body: payload, auth: false });
    localStorage.setItem("hm_token", token);
    setUser(user);
    return user;
  };

  const login = (email, password) => authenticate("/auth/login", { email, password });
  const register = (payload) => authenticate("/auth/register", payload);

  const logout = () => {
    localStorage.removeItem("hm_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

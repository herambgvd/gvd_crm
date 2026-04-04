import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

import { BACKEND_URL } from "../lib/axios";
const API = `${BACKEND_URL}/api/v1`;

const clearTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Refresh access token silently ─────────────────────────────────────────
  const refreshAccessToken = useCallback(async () => {
    const refresh_token = localStorage.getItem("refresh_token");
    if (!refresh_token) return null;
    try {
      const response = await axios.post(`${API}/auth/refresh`, { refresh_token });
      const { access_token } = response.data;
      localStorage.setItem("token", access_token);
      return access_token;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    }
  }, []);

  // ── Validate token on mount ───────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        // Silent refresh attempt
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const retryResponse = await axios.get(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${newToken}` },
            });
            setUser(retryResponse.data);
          } catch {
            clearTokens();
            setUser(null);
          }
        }
      } else {
        clearTokens();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAccessToken]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem("token", access_token);
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
    setUser(response.data.user);
    return response.data;
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

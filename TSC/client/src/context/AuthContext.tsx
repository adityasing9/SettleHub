import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  upiId?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  isVerified: boolean;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, name: string, phone?: string, upiId?: string) => Promise<{ verificationCode: string }>;
  verifyCode: (email: string, code: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_BASE_URL = window.location.origin.includes("localhost") 
  ? "http://localhost:5000/api" 
  : "/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("smartsplit_token"));
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-fetch profile if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            // Token expired or invalid
            logout();
          }
        } catch (error) {
          console.error("Auth init error:", error);
          // Try loading user from local storage cache if offline
          const cachedUser = localStorage.getItem("smartsplit_user");
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("smartsplit_token", data.token);
    localStorage.setItem("smartsplit_user", JSON.stringify(data.user));
  };

  const registerUser = async (email: string, password: string, name: string, phone?: string, upiId?: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, phone, upiId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    return { verificationCode: data.verificationCode };
  };

  const verifyCode = async (email: string, code: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Verification failed");
    }

    if (user && user.email === email) {
      const updated = { ...user, isVerified: true };
      setUser(updated);
      localStorage.setItem("smartsplit_user", JSON.stringify(updated));
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update profile");
    }

    setUser(data.user);
    localStorage.setItem("smartsplit_user", JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("smartsplit_token");
    localStorage.removeItem("smartsplit_user");
  };

  // Wrapper for API calls that appends JWT token & handles offline queueing for writes
  const apiFetch = async (urlSuffix: string, options: RequestInit = {}): Promise<Response> => {
    const fullUrl = `${API_BASE_URL}${urlSuffix}`;
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    if (!navigator.onLine && options.method && options.method !== "GET") {
      // Offline write: enqueue action and return mock offline response
      const { queueOfflineAction } = await import("../utils/idb");
      await queueOfflineAction({
        url: fullUrl,
        method: options.method as "POST" | "PUT" | "DELETE",
        body: options.body ? JSON.parse(options.body as string) : null,
        headers,
        timestamp: Date.now(),
      });

      // Dispatch event to notify offline count has changed
      window.dispatchEvent(new Event("offline_action_queued"));

      return new Response(
        JSON.stringify({ offline: true, message: "Action queued offline. Will sync when back online." }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      );
    }

    return fetch(fullUrl, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerUser,
        verifyCode,
        updateProfile,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

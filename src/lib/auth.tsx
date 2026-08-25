import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { isDemoMode, apiConfig } from "@/lib/api";

interface User {
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void | Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_CREDENTIALS = {
  email: "admin@halamama.com",
  password: "admin123",
};

const MOCK_USER: User = {
  name: "Ahmed Hassan",
  email: "admin@halamama.com",
  role: "Operations Admin",
  initials: "AH",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("hm_auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Check demo credentials first (matches the credentials displayed on the login card)
    if (email.toLowerCase() === MOCK_CREDENTIALS.email.toLowerCase() && password === MOCK_CREDENTIALS.password) {
      setUser(MOCK_USER);
      localStorage.setItem("hm_auth_user", JSON.stringify(MOCK_USER));
      return true;
    }

    if (isDemoMode()) {
      await new Promise((r) => setTimeout(r, 400));
      return false;
    }

    try {
      const baseUrl = apiConfig.baseUrl ? apiConfig.baseUrl.replace(/\/$/, "") : "";
      const response = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) return false;

      const resData = await response.json();
      if (resData.success && resData.data?.token) {
        const userData = resData.data.user;
        const initials = userData.name
          ? userData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
          : "US";
        const mappedUser: User = {
          name: userData.name || "",
          email: userData.email || "",
          role: userData.role || "Admin",
          initials,
        };

        setUser(mappedUser);
        localStorage.setItem("hm_auth_user", JSON.stringify(mappedUser));
        localStorage.setItem("hm_auth_token", resData.data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Auth] Login request failed:", err);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isDemoMode()) {
      try {
        const token = localStorage.getItem("hm_auth_token");
        if (token) {
          const baseUrl = apiConfig.baseUrl ? apiConfig.baseUrl.replace(/\/$/, "") : "";
          await fetch(`${baseUrl}/api/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          });
        }
      } catch (err) {
        console.error("[Auth] Logout request failed:", err);
      }
    }

    setUser(null);
    localStorage.removeItem("hm_auth_user");
    localStorage.removeItem("hm_auth_token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

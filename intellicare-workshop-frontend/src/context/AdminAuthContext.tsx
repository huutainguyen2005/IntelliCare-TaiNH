import React, { createContext, useContext, useState } from "react";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem("adminToken"),
  );
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem("adminUsername"),
  );

  const login = (token: string, name: string) => {
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminUsername", name);
    setIsAuthenticated(true);
    setUsername(name);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUsername");
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{ isAuthenticated, username, login, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth phải dùng trong AdminAuthProvider");
  return ctx;
}

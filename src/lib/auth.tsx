import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as api from "./api";

type Session = {
  username: string | null;
  firstName: string;
  isAdmin: boolean;
  isVerified: boolean;
  canDeleteUsers: boolean;
};

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  markVerified: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const username = await api.currentUser();
    if (!username) {
      setSession(null);
      return;
    }
    setSession({
      username,
      firstName: await api.currentFirstName(),
      isAdmin: await api.currentIsAdmin(),
      isVerified: await api.currentIsVerified(),
      canDeleteUsers: await api.currentCanDeleteUsers(),
    });
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      login: async (username, password) => {
        await api.login(username, password);
        await load();
      },
      register: async (username, password, email, firstName, lastName) => {
        await api.register(username, password, email, firstName, lastName);
        await load();
      },
      logout: async () => {
        await api.clearSession();
        setSession(null);
      },
      refresh: load,
      markVerified: async () => {
        await api.updateCachedVerified(true);
        await load();
      },
    }),
    [session, isLoading, load]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

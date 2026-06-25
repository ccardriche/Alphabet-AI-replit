import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "@alphabet_ai_token";
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string | null;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const fetchUser = useCallback(async (tok: string) => {
    try {
      const res = await fetch(`https://${DOMAIN}/api/auth/user`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json() as { user?: AuthUser };
        if (data.user) setUser(data.user);
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          setToken(stored);
          await fetchUser(stored);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchUser]);

  const signIn = useCallback(
    async (tok: string) => {
      await AsyncStorage.setItem(TOKEN_KEY, tok);
      setToken(tok);
      await fetchUser(tok);
    },
    [fetchUser]
  );

  const signOut = useCallback(async () => {
    if (token) {
      fetch(`https://${DOMAIN}/api/mobile-auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

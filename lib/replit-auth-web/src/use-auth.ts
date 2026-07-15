import { useState, useEffect, useCallback } from "react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/react";
import { resolveApiUrl } from "@workspace/api-client-react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (mode?: "signin" | "signup") => void;
  logout: () => void;
}

// Auth is backed by Clerk (session + login/logout), while the app user — and
// crucially its role — comes from the server's /api/me (the Clerk session
// cookie is sent same-origin and validated by clerkMiddleware). Keeps the
// original hook interface so app pages stay unchanged.
export function useAuth(): AuthState {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const clerk = useClerk();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    fetch(resolveApiUrl("/api/me"), { credentials: "include" })
      .then((res) => (res.status === 401 ? null : res.ok ? res.json() : null))
      .then((data: AuthUser | null) => {
        if (!cancelled) {
          setUser(data ?? null);
          setProfileLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setProfileLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const login = useCallback((mode: "signin" | "signup" = "signin") => {
    // Route to the app's own email-free username login pages.
    window.location.href = mode === "signup" ? "/signup" : "/signin";
  }, []);

  const logout = useCallback(() => {
    void clerk.signOut({ redirectUrl: "/" });
  }, [clerk]);

  return {
    user,
    isLoading: !isLoaded || (isSignedIn && profileLoading),
    isAuthenticated: !!isSignedIn,
    login,
    logout,
  };
}

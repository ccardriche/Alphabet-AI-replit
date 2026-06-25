import { useCallback } from "react";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

// Backed by Clerk. Keeps the original hook interface so app pages
// (App.tsx, Landing.tsx) stay unchanged after the auth provider swap.
export function useAuth(): AuthState {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();

  const user: AuthUser | null =
    isSignedIn && clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          firstName: clerkUser.firstName ?? null,
          lastName: clerkUser.lastName ?? null,
          profileImageUrl: clerkUser.imageUrl ?? null,
          role: "student",
        }
      : null;

  const login = useCallback(() => {
    const returnTo = window.location.pathname + window.location.search;
    clerk.redirectToSignIn({
      signInForceRedirectUrl: returnTo,
      signUpForceRedirectUrl: returnTo,
    });
  }, [clerk]);

  const logout = useCallback(() => {
    void clerk.signOut({ redirectUrl: "/" });
  }, [clerk]);

  return {
    user,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    login,
    logout,
  };
}

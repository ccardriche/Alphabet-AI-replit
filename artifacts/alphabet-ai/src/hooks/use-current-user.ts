import { ROLE_KEY, DISPLAY_NAME_KEY } from "@/lib/constants";
import type { UserRole } from "@/lib/role";

export interface CurrentUser {
  displayName: string | null;
  role: UserRole;
}

export function useCurrentUser(): CurrentUser {
  const role = (localStorage.getItem(ROLE_KEY) as UserRole) ?? null;
  const displayName = localStorage.getItem(DISPLAY_NAME_KEY) ?? null;
  return { displayName, role };
}

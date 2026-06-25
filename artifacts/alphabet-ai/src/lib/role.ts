import { ROLE_KEY, VIEW_AS_KEY } from "./constants";

export type UserRole = "student" | "teacher" | "caregiver" | "admin" | null;
export type ViewRole = "student" | "teacher" | "caregiver";

export function getRole(): UserRole {
  return (localStorage.getItem(ROLE_KEY) as UserRole) ?? null;
}

export function setRole(role: Exclude<UserRole, null>): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearRole(): void {
  localStorage.removeItem(ROLE_KEY);
  clearViewAs();
}

// ── Admin "view as" ────────────────────────────────────────────────────────
// Lets an admin preview the student / teacher / caregiver views without
// changing their real account role.

export function getViewAs(): ViewRole | null {
  return (sessionStorage.getItem(VIEW_AS_KEY) as ViewRole) ?? null;
}

export function setViewAs(role: ViewRole): void {
  sessionStorage.setItem(VIEW_AS_KEY, role);
}

export function clearViewAs(): void {
  sessionStorage.removeItem(VIEW_AS_KEY);
}

// The effective role that drives the current view. For an admin previewing a
// view this is the view-as role; otherwise it's the user's real role.
export function getActiveRole(): UserRole {
  const role = getRole();
  if (role === "admin") return getViewAs() ?? "admin";
  return role;
}

import { ROLE_KEY } from "./constants";

export type UserRole = "student" | "teacher" | null;

export function getRole(): UserRole {
  return (localStorage.getItem(ROLE_KEY) as UserRole) ?? null;
}

export function setRole(role: "student" | "teacher"): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearRole(): void {
  localStorage.removeItem(ROLE_KEY);
}

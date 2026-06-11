import { type Request, type Response, type NextFunction } from "express";

export function requireCaregiver(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "caregiver") {
    return res.status(403).json({ error: "Forbidden: caregiver role required" });
  }
  return next();
}

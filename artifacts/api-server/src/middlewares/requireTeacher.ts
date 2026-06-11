import { type Request, type Response, type NextFunction } from "express";

export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Forbidden: teacher role required" });
  }
  return next();
}

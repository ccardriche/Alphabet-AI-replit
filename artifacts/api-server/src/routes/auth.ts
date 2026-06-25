import { Router, type Request, type Response, type IRouter } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";

// Auth endpoints. Authentication itself is handled by Clerk on the frontend
// and the clerkMiddleware + authMiddleware shim on the server; these routes
// just expose the current user and a logout convenience redirect.
const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/me", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json(null);
    return;
  }
  res.json(req.user);
});

router.get("/logout", (_req: Request, res: Response) => {
  res.redirect("/");
});

export default router;

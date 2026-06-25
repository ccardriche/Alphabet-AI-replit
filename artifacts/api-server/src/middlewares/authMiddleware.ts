import { type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

// Clerk-backed auth shim. Populates req.user from the app's own users table
// (so downstream routes keep using req.user.id / req.user.role unchanged) and
// provisions a users row on first sign-in from the Clerk profile.
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const { userId } = getAuth(req);
  if (!userId) {
    next();
    return;
  }

  try {
    let [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!row) {
      let email: string | null = null;
      let firstName: string | null = null;
      let lastName: string | null = null;
      let profileImageUrl: string | null = null;
      try {
        const cu = await clerkClient.users.getUser(userId);
        email =
          cu.primaryEmailAddress?.emailAddress ??
          cu.emailAddresses[0]?.emailAddress ??
          null;
        firstName = cu.firstName ?? null;
        lastName = cu.lastName ?? null;
        profileImageUrl = cu.imageUrl ?? null;
      } catch {
        // Clerk profile fetch is best-effort; proceed with id only.
      }

      const inserted = await db
        .insert(usersTable)
        .values({ id: userId, email, firstName, lastName, profileImageUrl })
        .onConflictDoNothing()
        .returning();
      row = inserted[0];
      if (!row) {
        [row] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId));
      }
    }

    if (row) {
      req.user = {
        id: row.id,
        email: row.email ?? null,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        profileImageUrl: row.profileImageUrl ?? null,
        role: row.role,
      };
    }
  } catch {
    // On any failure, leave the request unauthenticated.
  }

  next();
}

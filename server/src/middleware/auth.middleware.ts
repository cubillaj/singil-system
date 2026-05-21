import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { getAuthSession } from "../services/authSession.js";
import { UserRoleSchema, type UserRole } from "../validation/user.validation.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authSession = getAuthSession(req);

  if (!authSession) {
    next(new AppError("Authentication required", 401));
    return;
  }

  req.authSession = authSession;
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }

      const parsedRole = UserRoleSchema.safeParse(req.authSession?.role);

      if (!parsedRole.success || !allowedRoles.includes(parsedRole.data)) {
        next(new AppError("Forbidden", 403));
        return;
      }

      next();
    });
  };
}

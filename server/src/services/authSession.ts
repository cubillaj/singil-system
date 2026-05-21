import { Request } from "express";
import { AuthSessionSchema, type AuthSession } from "../validation/auth.validation.js";
import { AppError } from "../utils/appError.js";

type AuthUser = AuthSession;

const regenerateSession = async (req: Request) => {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

const saveSession = async (req: Request) => {
  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

export const getAuthSession = (req: Request) => {
  const parsed = AuthSessionSchema.safeParse({
    userId: req.session.userId,
    organizationId: req.session.organizationId,
    role: req.session.role,
  });

  return parsed.success ? parsed.data : null;
};

export const createAuthSession = async (req: Request, user: AuthUser) => {
  const parsed = AuthSessionSchema.safeParse(user);

  if (!parsed.success) {
    throw new AppError("Invalid auth session data", 500);
  }

  await regenerateSession(req);

  req.session.userId = parsed.data.userId;
  req.session.organizationId = parsed.data.organizationId;
  req.session.role = parsed.data.role;

  await saveSession(req);

  return parsed.data;
};

export const destroyAuthSession = async (req: Request) => {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

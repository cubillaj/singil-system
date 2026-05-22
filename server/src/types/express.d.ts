import { User } from "../db/schema.ts";
import { AuthSession } from "../validation/auth.validation.ts";

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "passwordHash">;
      authSession?: AuthSession;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    organizationId?: number | null;
    role?: User["role"];
  }
}

export {}

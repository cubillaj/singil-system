import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { organizationInvites, organizations, users, type User } from "../db/schema.js";
import { AppError } from "../utils/appError.js";
import { createAuthSession, destroyAuthSession } from "../services/authSession.js";
import { LoginSchema, RegisterSchema } from "../validation/auth.validation.js";

const saltRounds = 12;

function getFirstZodMessage(error: unknown) {
  const parsedError = error as { flatten?: () => { fieldErrors: Record<string, string[]> } };
  const fieldErrors = parsedError.flatten?.().fieldErrors;

  return Object.values(fieldErrors ?? {}).flat()[0] ?? "Invalid data";
}

function createSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "organization"}-${Date.now().toString(36)}`;
}

function sanitizeUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;

  return safeUser;
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(getFirstZodMessage(parsed.error), 400);
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (existingUser) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, saltRounds);

    const user = await db.transaction(async (tx) => {
      let organizationId: number;
      let userRole = parsed.data.role;
      let invitationId: number | null = null;

      if (parsed.data.role === "owner") {
        if (!parsed.data.organizationName) {
          throw new AppError("Organization name is required", 400);
        }

        const organizationName = parsed.data.organizationName.trim();

        const [organization] = await tx.insert(organizations).values({
          name: organizationName,
          slug: createSlug(organizationName),
        }).returning({ id: organizations.id });

        organizationId = organization.id;
      } else {
        if (!parsed.data.code) {
          throw new AppError("Invitation code is required", 400);
        }

        const [invitation] = await tx.select({
              id: organizationInvites.id,
              expiresAt: organizationInvites.expiresAt,
              role: organizationInvites.role,
              organizationId: organizationInvites.organizationId,
              usedAt: organizationInvites.usedAt
           })
          .from(organizationInvites)
          .where(eq(organizationInvites.code, parsed.data.code))
          .limit(1);

        if (!invitation) {
          throw new AppError('Invalid code', 400)
        } 

        if (invitation.usedAt) {
          throw new AppError('Invitation already used', 400)
        }
        
        if(invitation.expiresAt <= new Date()) {
          throw new AppError("Invitation Expired.", 400);
        } 
      

        organizationId = invitation.organizationId;
        userRole = invitation.role;
        invitationId = invitation.id;
      }

      const [createdUser] = await tx.insert(users).values({
        organizationId,
        name: parsed.data.name,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        passwordHash,
        role: userRole,
        avatarUrl: parsed.data.avatarUrl,
      }).returning();

      if (invitationId) {
        await tx.update(organizationInvites)
          .set({ usedAt: new Date() })
          .where(eq(organizationInvites.id, invitationId));
      }

      return createdUser;
    });

    const session = await createAuthSession(req, {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    return res.status(201).json({
      message: "Account created",
      user: sanitizeUser(user),
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(getFirstZodMessage(parsed.error), 400);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    const session = await createAuthSession(req, {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    return res.status(200).json({
      message: "Logged in",
      user: sanitizeUser(user),
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = req.authSession!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: {
        name: true,
        lastName: true,
        email: true,
        role: true
      },
      with: {
        organization: {
          columns: {
            name: true
          }
        }
      }
    });

    if (!user) {
      await destroyAuthSession(req);
      throw new AppError("Authentication required", 401);
    }

    return res.status(200).json({
      user
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await destroyAuthSession(req);
    res.clearCookie("sid");

    return res.status(200).json({
      message: "Logged out",
    });
  } catch (error) {
    next(error);
  }
};

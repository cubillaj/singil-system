import z from "zod";
import { UserRoleSchema } from "./user.validation.js";

export const RegisterSchema = z.object({
  code: z.uuid({ error: "Invalid code" }).optional(),
  name: z.string({ error: "Name is required" })
    .min(1, "Name is required.")
    .max(50, "Max letter is only 50"),
  lastName: z.string({ error: "Lastname is required" })
    .min(1, "Lastname is required.")
    .max(50, "Max letter is only 50"),
  organizationName: z.string({ error: "Organization name is required" })
    .min(1, "Organization name is required.")
    .max(100, "Max letter is only 100").optional(),
  email: z.email({ error: "Invalid Email format" })
    .transform((value) => value.toLocaleLowerCase()),
  password: z.string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
  avatarUrl: z.url().optional(),
  role: z.enum(['member', 'admin', 'owner']).default('member')
}).superRefine((data, ctx) => {
  if (data.role === "owner" && !data.organizationName) {
    ctx.addIssue({
      code: "custom",
      path: ["organizationName"],
      message: "Organization name is required",
    });
  }

  if (data.role !== "owner" && !data.code) {
    ctx.addIssue({
      code: "custom",
      path: ["code"],
      message: "Invitation code is required",
    });
  }
});

export const LoginSchema = z.object({
  email: z.email({ error: "Invalid Email format" })
    .transform((value) => value.toLocaleLowerCase()),
  password: z.string({ error: "Password is required" })
    .min(1, "Password is required"),
});

export const AuthSessionSchema = z.object({
  userId: z.number().int().positive(),
  organizationId: z.number().int().positive().nullable(),
  role: UserRoleSchema,
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;

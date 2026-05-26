import z from "zod";

export const role = [
    'system_admin',
  'owner',
  'admin',
  'member'
] as const

export const UserRoleSchema = z.enum(role)
export type UserRole = z.infer<typeof UserRoleSchema>

export const UserSchema = z.object({
    name: z.string( { error: 'Name is required'})
        .min(1, 'Name is required.')
        .max(50, 'Max letter is only 50'),
    lastName: z.string( { error: 'Lastname is required'})
        .min(1, 'Lastname is required.')
        .max(50, 'Max letter is only 50'),
    organizationId: z.number().positive().nullable(),
    email: z.email( {error: 'Invalid format' })    
        .transform(value => value.toLocaleLowerCase() ),
    status: z.enum(['active', 'inActive']).default('active'),
    role: UserRoleSchema.default('member').nullable(),
    avatarUrl: z.url().optional(),
    emailVerified: z.boolean().default(false)
})

export const UpdateUserSchema = UserSchema.pick({
    name: true,
    lastName: true,
    email: true,
    avatarUrl: true
})
.partial()


export const UserChangePasswordSchema = z.object({
    userId: z.coerce.number( {error: 'User id is required.'}).int().positive(),
    currentPassword: z.string({ error: 'Current password is required.'}).min(1).max(75),
    newPassword: z.string( {error: "New password is required"})
            .min(8, 'Password must be at least 8 characters')
            .max(72, 'Password must be 72 characters or fewer')
            .regex(/[a-z]/, 'Password must include at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
            .regex(/[0-9]/, 'Password must include at least one number')
            .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character'), 
    confirmPassword: z.string( {error: "New password is required"})
            .min(8, 'Password must be at least 8 characters')
            .max(72, 'Password must be 72 characters or fewer')
            .regex(/[a-z]/, 'Password must include at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
            .regex(/[0-9]/, 'Password must include at least one number')
            .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character'), 
}).superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
            code: 'custom',
            path: ['confirmPassword'],
            message: 'New password and confirm password do not match'
        })
    }
})

export type User = z.infer<typeof UserSchema>
export type UserChangePassword = z.infer<typeof UserChangePasswordSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
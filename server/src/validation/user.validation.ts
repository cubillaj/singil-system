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
    role: UserRoleSchema.default('member').nullable(),
    avatarUrl: z.url().optional(),
    emailVerified: z.boolean().default(false)
})

export type User = z.infer<typeof UserSchema>

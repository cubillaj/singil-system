import z from "zod";

export const UpdateOrganizationSchema = z.object({
    name: z.string({ error: 'Name is required'}).min(1).max(50).optional(),
    logoUrl: z.string().url('Logo must be a valid url').optional(),
    logoHash: z.string().length(64, 'Invalid logo hash').optional()
})

export const OrganizationMembersAndAdminQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(['active', 'inactive', 'inActive']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(10).default(10),
    sortBy: z.
        enum(['createdAt'])
        .default('createdAt'),
    sortOrder: z.
        enum(['asc', 'desc'])
        .default('desc'),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional()
})

export const OrganizationUpdateUserSchema = z.object({
    targetUser: z.coerce.number().positive(),
    userId: z.coerce.number().positive(),
    organizationId: z.coerce.number().positive(),
    name: z.string({ error: 'Name is required'})
        .min(1, 'Name is required.')
        .max(50, 'Max letter is only 50')
        .optional(),
    lastName: z.string({ error: 'Lastname is required'})
        .min(1, 'Lastname is required.')
        .max(50, 'Max letter is only 50')
        .optional(),
    role: z.enum(['owner', 'admin', 'member']).optional(),
    status: z.enum(['active', 'inActive']).optional()
}).strict()

export const DeleteOrganizationSchema = z.object({
    organizationId: z.coerce.number().positive(),
    userId: z.coerce.number().positive(),
    userRole: z.enum(['admin', 'owner']),
    targetUser: z.coerce.number().positive()
})

export const SingleUserOrganizationSchema = z.object({
    organizationId: z.coerce.number({error: 'Organization id is required'}).positive(),
    userId: z.coerce.number({error: 'user id is required'}).positive()
})

export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>
export type OrganizationMembersAndAdminQuery  = z.infer<typeof OrganizationMembersAndAdminQuerySchema>
export type OrganizationUpdateUser = z.infer<typeof OrganizationUpdateUserSchema>
export type SingleUserOrganization = z.infer<typeof SingleUserOrganizationSchema>
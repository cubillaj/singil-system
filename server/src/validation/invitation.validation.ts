import z from "zod";

export const InvitationSchema = z.object({
    organizationId: z.coerce.number().int().positive().optional(),
    role: z.enum(['owner', 'member', 'admin']).default('member'),
    expiresAt: z.coerce.date().refine((date) => date > new Date(), {
        message: 'Expiration date must be in the future'
    } )
})

export const GetInvitationSchema = z.coerce.number().int().positive()

export const InvitationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(10).default(10),
    sortBy: z.
        enum(['createdAt', 'expiresAt'])
        .default('createdAt'),
    sortOrder: z.
        enum(['asc', 'desc'])
        .default('desc'),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional()
})

export const DeleteInvitationSchema = z.object({
    id: z.union([
        z.coerce.number().int().positive(),
        z.array(z.coerce.number().int().positive()).min(1, 'At least one invitation ID is required')
    ]).transform((value) => Array.isArray(value) ? value : [value]),
    organizationId: z.coerce.number().int().positive()
})

export type Invitation = z.infer<typeof InvitationSchema>
export type GetInvitation = z.infer<typeof GetInvitationSchema>
export type InvitationQuery = z.infer<typeof InvitationQuerySchema>
export type DeleteInvitation = z.infer<typeof DeleteInvitationSchema>

import z from "zod";

export const InvitationSchema = z.object({
    organizationId: z.coerce.number().int().positive().optional(),
    role: z.enum(['owner', 'member', 'admin']).default('member'),
    expiresAt: z.coerce.date().refine((date) => date > new Date(), {
        message: 'Expiration date must be in the future'
    } )
})

export type Invitation = z.infer<typeof InvitationSchema>
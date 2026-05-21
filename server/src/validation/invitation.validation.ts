import z from "zod";

export const InvitationSchema = z.object({
    role: z.enum(['owner', 'member']).default('member'),
    expiresAt: z.coerce.date().refine((date) => date > new Date(), {
        message: 'Expiration date must be in the future'
    } )
})

export type Invitation = z.infer<typeof InvitationSchema>
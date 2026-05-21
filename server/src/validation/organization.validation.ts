import z from "zod";

export const UpdateOrganizationSchema = z.object({
    name: z.string({ error: 'Name is required'}).min(1).max(50).optional(),
    logoUrl: z.string().url('Logo must be a valid url').optional(),
    logoHash: z.string().length(64, 'Invalid logo hash').optional()
})

export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>

import z from "zod";

export const DashboardSchema = z.object({
    organizationId: z.coerce.number( { error: 'Organization id is required.'})
                            .int()
                            .positive({ error: 'Organization id must be positive'})
})

export type Dashboard = z.infer<typeof DashboardSchema>
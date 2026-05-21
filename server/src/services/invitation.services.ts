import { and, eq } from "drizzle-orm"
import { db } from "../db/db.js"
import { organizationInvites, organizations, users } from "../db/schema.js"
import { AppError } from "../utils/appError.js"
import { InvitationSchema } from "../validation/invitation.validation.js"

export const createOrganizationInvitation = async (userId: number, organizationId: number, data: unknown) => {
    const parsed = InvitationSchema.safeParse(data)

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msgVal, 400)
    } 

    const { role, expiresAt } = parsed.data

    if (typeof organizationId !== 'number') {
        throw new AppError('Invalid data', 400)
    }

    // Only allow users to create invites for the organization stored in their session.
    const existingUser = await db.query.users.findFirst({
        where: and(
            eq(users.organizationId, organizationId),
            eq(users.id, userId)
        ),
        columns: {
            id: true,
            organizationId: true
        }
    })

    if (!existingUser) {
        throw new AppError('Organization is not found', 404)
    }

    // Return the invitation code so the client can share it with the invited user.
    const [createInvitation] = await db.insert(organizationInvites)
                                        .values({
                                            organizationId,
                                            createdById: userId,
                                            role,
                                            expiresAt,
                                        })
                                        .returning({
                                            code: organizationInvites.code,
                                            role: organizationInvites.role,
                                            expiresAt: organizationInvites.expiresAt,
                                        })

    if (!createInvitation) {
        throw new AppError('Failed to create invitation', 400)
    }

    return createInvitation
}   

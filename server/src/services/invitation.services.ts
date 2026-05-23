import { and, eq } from "drizzle-orm"
import { db } from "../db/db.js"
import { organizationInvites, organizations, users } from "../db/schema.js"
import { AppError } from "../utils/appError.js"
import { DeleteInvitationSchema, GetInvitationSchema, InvitationQuerySchema, InvitationSchema } from "../validation/invitation.validation.js"
import { getFirstZodMessage } from "../utils/zodErrors.js"
import { invitationFilters } from "../utils/invitation.utils.js"

export const getInvitation = async (organizationId: unknown, query: unknown) => {
    const parsedInvitation = GetInvitationSchema.safeParse(organizationId)

    if (!parsedInvitation.success) {
        throw new AppError(getFirstZodMessage(parsedInvitation.error), 400)
    }

    const parsedInvitationQuery = InvitationQuerySchema.safeParse(query)

    if(!parsedInvitationQuery.success) {
        throw new AppError(getFirstZodMessage(parsedInvitationQuery.error), 400)
    }

     if(typeof organizationId !== 'number') {
                throw new AppError('Invalid data', 400)
    }
    
    if (!organizationId) throw new AppError('Organization id is required', 400)


    const {filters,
         page,
        limit, 
        offSet, 
        total, 
        totalPages, 
        orderBy} = await invitationFilters(organizationId, query)

    const allInvitation = await db.query.organizationInvites.findMany({
        where: and(...filters),
        columns: {
            id: true,
            code: true,
            role: true,
            expiresAt: true,
            createdAt: true,
            usedAt: true
        },
        orderBy,
        limit,
        offset: offSet
    })

    return {
        invitations: allInvitation,
        pagination: {
            total,
            totalPages,
            page,
            limit
        }
    }                        
}

export const createOrganizationInvitation = async (userId: number, userRole: string, organizationId: number | null, data: unknown) => {
    const parsed = InvitationSchema.safeParse(data)

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msgVal, 400)
    } 

    const { role, organizationId: targetOrganizationId, expiresAt } = parsed.data
    
    let orgId: number;

    if (userRole === 'system_admin') {
        if(!targetOrganizationId) {
            throw new AppError('Organization id is required.', 400)
        }

        const [organization] = await db.select({
            id: organizations.id
        })
                                        .from(organizations)
                                        .where(eq(organizations.id, targetOrganizationId))

        if (!organization) {
            throw new AppError('Organization is not found', 404)
        }
        orgId = organization.id
    } else {

    if (typeof organizationId !== 'number') {
        throw new AppError('Organization is required', 400)
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
    if (!existingUser.organizationId) {
        throw new AppError('Organization is required', 400)
    }

    orgId = existingUser.organizationId
    }

    // Return the invitation code so the client can share it with the invited user.
    const [createInvitation] = await db.insert(organizationInvites)
                                        .values({
                                            organizationId: orgId,
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

export const deleteInvitation = async (ids: unknown) => {
    const parsedIds = DeleteInvitationSchema.safeParse(ids)

    if(!parsedIds.success) {
        throw new AppError(getFirstZodMessage(parsedIds.error), 400)
    }

    const {id, organizationId} = parsedIds.data

    const [deletedInvitation] = await db.delete(organizationInvites)
                                        .where(and(
                                            eq(organizationInvites.id, id),
                                            eq(organizationInvites.organizationId, organizationId)
                                        ))
                                        .returning({
                                            id: organizationInvites.id
                                        })
    
    if(!deletedInvitation) {
        throw new AppError('Invitation not found.', 404)
    }

    return deletedInvitation
}

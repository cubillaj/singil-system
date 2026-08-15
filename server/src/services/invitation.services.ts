import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm"
import { db } from "../db/db.js"
import { organizationInvites, organizations, users } from "../db/schema.js"
import { AppError } from "../utils/appError.js"
import { DeleteInvitationSchema, GetInvitationSchema, InvitationQuerySchema, InvitationSchema } from "../validation/invitation.validation.js"
import { getFirstZodMessage } from "../utils/zodErrors.js"
import { getOrganizationEntitlements } from "./subscription.services.js"
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

    const entitlements = await getOrganizationEntitlements(orgId)

    if (entitlements.maxMembers !== null) {
        const [[{ count: memberCount }], [{ count: pendingInviteCount }]] = await Promise.all([
            db.select({ count: sql<number>`count(*)` })
                .from(users)
                .where(eq(users.organizationId, orgId)),
            db.select({ count: sql<number>`count(*)` })
                .from(organizationInvites)
                .where(and(
                    eq(organizationInvites.organizationId, orgId),
                    isNull(organizationInvites.usedAt),
                    gt(organizationInvites.expiresAt, new Date())
                ))
        ])

        if (Number(memberCount) + Number(pendingInviteCount) >= entitlements.maxMembers) {
            throw new AppError(`Your ${entitlements.effectivePlan} plan allows up to ${entitlements.maxMembers} organization members, including pending invitations.`, 403)
        }
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
    const invitationIds = [...new Set(id)]

    const organizationInvite = await db.query.organizationInvites.findMany({
        where: and(inArray(organizationInvites.id, invitationIds), eq(organizationInvites.organizationId, organizationId)),
        columns: {
            id: true,
            usedAt: true
        },
        with: {
            organization: {
                columns: {
                    plan: true
                }
            }
        }
    })

    if (organizationInvite.length === 0) throw new AppError('Organization invite is not found', 404)

    if (organizationInvite.length !== invitationIds.length) {
        throw new AppError('One or more invitations were not found.', 404)
    }

    const hasUsedFreePlanInvite = organizationInvite.some((invite) => invite.usedAt !== null && invite.organization.plan === 'free')
    if(hasUsedFreePlanInvite) {
        throw new AppError('You cannot delete invitation that is already used in free plan.', 403)
    }

    const deletedInvitation = await db.delete(organizationInvites)
                                        .where(and(
                                            inArray(organizationInvites.id, invitationIds),
                                            eq(organizationInvites.organizationId, organizationId)
                                        ))
                                        .returning({
                                            id: organizationInvites.id
                                        })
    
    if(deletedInvitation.length === 0) {
        throw new AppError('Invitation not found.', 404)
    }

    return deletedInvitation
}

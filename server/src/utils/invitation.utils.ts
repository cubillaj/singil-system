import { and, asc, desc, eq, gt, gte, ilike, lte, ne, or, sql, SQL } from "drizzle-orm"
import { OrganizationMembersAndAdminQuerySchema } from "../validation/organization.validation.js"
import { AppError } from "./appError.js"
import { getFirstZodMessage } from "./zodErrors.js"
import { organizationInvites, users } from "../db/schema.js"
import { db } from "../db/db.js"
import { InvitationQuerySchema } from "../validation/invitation.validation.js"

export const invitationFilters = async (organizationId: number, query: unknown) => {
    const parsed = InvitationQuerySchema.safeParse(query)

    if (!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { limit, sortBy, sortOrder, page, createdFrom, createdTo} = parsed.data

    const filters: SQL[] = [
        eq(organizationInvites.organizationId, organizationId), 
    ]

    if (createdFrom) {
        filters.push(gte(organizationInvites.createdAt, createdFrom))
    }

    if (createdTo) {
        filters.push(lte(organizationInvites.createdAt, createdTo))
    }

    const sortColumn = {
        createdAt: organizationInvites.createdAt,
        expiresAt: organizationInvites.expiresAt
    }[sortBy]

    const orderBy = 
        sortOrder === 'asc'
            ? asc(sortColumn)
            : desc(sortColumn)

    const offSet = (page - 1) * limit

    const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                .from(organizationInvites)
                                .where(and(...filters))

    const total = Number(count)
    const totalPages = Math.ceil(total / limit)
    return {
        filters,
        offSet,
        total,
        totalPages,
        limit,
        orderBy,
        page
    }
}
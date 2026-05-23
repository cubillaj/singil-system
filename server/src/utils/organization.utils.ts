import { and, asc, desc, eq, gt, gte, ilike, lte, ne, or, sql, SQL } from "drizzle-orm"
import { OrganizationMembersAndAdminQuerySchema } from "../validation/organization.validation.js"
import { AppError } from "./appError.js"
import { getFirstZodMessage } from "./zodErrors.js"
import { users } from "../db/schema.js"
import { db } from "../db/db.js"

type UserRole = 'owner' | 'admin'

export const organizationFilters = async (role: UserRole, organizationId: number, query: unknown) => {
    const parsed = OrganizationMembersAndAdminQuerySchema.safeParse(query)

    if (!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { search, limit, sortBy, sortOrder, page, status, createdFrom, createdTo} = parsed.data

    const filters: SQL[] = [
        eq(users.organizationId, organizationId), 
        ne(users.role, 'owner'),
        ne(users.role, role)
    ]

    if(search) {
        const searchFilter = or(
            ilike(users.name, `${search}`),
            ilike(users.lastName, `${search}`),
            ilike(users.email, `${search}`)
        )

        if (searchFilter) {
            filters.push(searchFilter)
        }
    }

    if (status) {
        const normalizedStatus = status === 'inactive' ? 'inActive' : status
        filters.push(eq(users.status, normalizedStatus))
    }

    if (createdFrom) {
        filters.push(gte(users.createdAt, createdFrom))
    }

    if (createdTo) {
        filters.push(lte(users.createdAt, createdTo))
    }

    const sortColumn = {
        createdAt: users.createdAt
    }[sortBy]

    const orderBy = 
        sortOrder === 'asc'
            ? asc(sortColumn)
            : desc(sortColumn)

    const offSet = (page - 1) * limit

    const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                .from(users)
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
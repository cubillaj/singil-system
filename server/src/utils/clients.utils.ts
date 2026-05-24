import { and, asc, desc, eq, gte, ilike, lte, or, sql, SQL } from "drizzle-orm"
import { ClientQuerySchema } from "../validation/clients.validation.js"
import { AppError } from "./appError.js"
import { clients } from "../db/schema.js"
import { db } from "../db/db.js"

export const clientsFilter = async (organizationId: number, query: unknown) => {
    const parsed = ClientQuerySchema.safeParse(query)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid Data'

        throw new AppError(msg, 400)
    }

    const {search, page, limit, createdFrom, createdTo, currency, sortBy, sortOrder } = parsed.data

    const filters: SQL[] = [
        eq(clients.organizationId, organizationId)
    ]

    if (search) {
        const searchFilter = or(
            ilike(clients.name, `%${search}%`),
            ilike(clients.email, `%${search}%`),
            ilike(clients.company, `%${search}%`),
            ilike(clients.state, `%${search}%`)
        )

        if(searchFilter) {
            filters.push(searchFilter)
        }
    }

    if(createdFrom) {
        filters.push(gte(clients.createdAt, createdFrom))
    }

    if (createdTo) {
        filters.push(lte(clients.createdAt, createdTo))
    }

    if (currency) {
        filters.push(eq(clients.currency, currency))
    }

    const sortColumn = {
        createdAt: clients.createdAt
    }[sortBy]

    const orderBy = 
            sortOrder === 'asc'
                ? asc(sortColumn)
                : desc(sortColumn)
    
    const offSet = (page - 1) * limit
    
    const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                .from(clients)
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

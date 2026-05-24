import { and, asc, desc, eq, gte, ilike, lte, or, sql, SQL } from "drizzle-orm"
import { ProductQuerySchema } from "../validation/products.validation.js"
import { AppError } from "./appError.js"
import { getFirstZodMessage } from "./zodErrors.js"
import { products } from "../db/schema.js"
import { db } from "../db/db.js"

export const productFilter = async (organizationId: number, query: unknown) => {
    const parsed = ProductQuerySchema.safeParse(query)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { search, page, limit, createdFrom, createdTo, sortBy, sortOrder } = parsed.data

    const filters: SQL[] = [
        eq(products.organizationId, organizationId)
    ]

    if(search) {
        const searchFilter =  or(
            ilike(products.name, `%${search}%`),
            ilike(products.unit, `%${search}%`)
            )

        if(searchFilter) {
            filters.push(searchFilter)
        }
    }

    if(createdFrom) {
        filters.push(gte(products.createdAt, createdFrom))
    }

    if(createdTo) {
        filters.push(lte(products.createdAt, createdTo))
    }

    const sortColumn = {
            createdAt: products.createdAt
        }[sortBy]
    
        const orderBy = 
            sortOrder === 'asc'
                ? asc(sortColumn)
                : desc(sortColumn)

    const offSet = (page - 1) * limit
    
    const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                .from(products)
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
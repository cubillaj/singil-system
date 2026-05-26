import { and, asc, desc, eq, gte, ilike, lte, or, sql, SQL } from "drizzle-orm"
import { InvoiceQuerySchema } from "../validation/invoices.validation.js"
import { AppError } from "./appError.js"
import { getFirstZodMessage } from "./zodErrors.js"
import { invoices } from "../db/schema.js"
import { db } from "../db/db.js"

export const invoiceFilter = async (organizationId: number, query: unknown) => {
    const parsed = InvoiceQuerySchema.safeParse(query)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {
        search,
        limit,
        page,
        dueFrom,
        dueTo,
        status,
        sortBy,
        sortOrder,
        currency,
        issueFrom,
        issueTo
    } = parsed.data

    const filters: SQL[] = [
        eq(invoices.organizationId, organizationId)
    ]

    if (search) {
        const searchFilter = or(
            ilike(invoices.invoiceNumber, `%${search}%`)
        )

        if (searchFilter) {
            filters.push(searchFilter)
        }
    }

    if (dueFrom) {
        filters.push(gte(invoices.dueDate, dueFrom))
    }

    if (dueTo) {
        filters.push(lte(invoices.dueDate, dueTo))
    }

    if (issueFrom) {
        filters.push(gte(invoices.issueDate, issueFrom))
    }

    if (issueTo) {
        filters.push(lte(invoices.issueDate, issueTo))
    }

    if(status) {
        filters.push(eq(invoices.status, status))
    }

    if(currency) {
        filters.push(eq(invoices.currency, currency))
    }

    const sortColumn = {
        createdAt: invoices.createdAt,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate
    }[sortBy]

    const orderBy = 
        sortOrder === 'asc' 
            ? asc(sortColumn)
            : desc(sortColumn)

    const offSet = (page - 1) * limit

    const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                .from(invoices)
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
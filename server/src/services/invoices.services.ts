import { and, eq } from "drizzle-orm"
import { db } from "../db/db.js"
import { clients, invoiceItems, invoices } from "../db/schema.js"
import { AppError } from "../utils/appError.js"
import { CreateInvoiceSchema, DeleteInvoiceSchema, GetSingleInvoiceSchema, UpdateInvoiceSchema, type CreateInvoice } from "../validation/invoices.validation.js"
import { getFirstZodMessage } from "../utils/zodErrors.js"
import { invoiceFilter } from "../utils/invoice.utils.js"



type IDS = {
    userId: number,
    organizationId: number
}

type InvoiceInputItem = CreateInvoice["items"][number]

const hasValue = (value: unknown) => value !== undefined

export const calculateInvoiceItemsAndTotals = (items: InvoiceInputItem[]) => {
    const calculatedItems = items.map((item, index) => {
        const quantity = Number(item.quantity)
        const unitPrice = Number(item.unitPrice)
        const discountRate = Number(item.discount ?? 0) / 100
        const taxRate = Number(item.taxRate ?? 0) / 100

        const baseAmount = quantity * unitPrice
        const discountAmount = baseAmount * discountRate
        const taxableAmount = baseAmount - discountAmount
        const taxAmount = taxableAmount * taxRate
        const total = taxableAmount + taxAmount

        return {
            productId: item.productId,
            description: item.description,
            quantity: quantity.toFixed(2),
            unitPrice: unitPrice.toFixed(2),
            taxRate: Number(item.taxRate ?? 0).toFixed(2),
            discount: Number(item.discount ?? 0).toFixed(2),
            total: total.toFixed(2),
            sortOrder: index,
            subtotal: baseAmount,
            taxAmount,
            discountAmount,
        }
    })

    const subtotal = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const taxAmount = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0)
    const discountAmount = calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0)
    const total = subtotal - discountAmount + taxAmount

    return {
        calculatedItems,
        subtotal,
        taxAmount,
        discountAmount,
        total
    }
}

export const createInvoice = async (ids: IDS, data: unknown) => {
    // Validate the full create payload before doing any database work.
    const parsed = CreateInvoiceSchema.safeParse(data)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msg, 400)
    }

    const { organizationId, userId } = ids

    const {
        dueDate,
        issueDate,
        items,
        clientId,
        status,
        currency,
        invoiceNumber,
        notes,
        internalNotes,
        footer,
        pdfUrl,
        amountPaid
    } = parsed.data

    // Make sure the selected client belongs to the current organization.
    const [client] = await db.select({
        id: clients.id
    })
                            .from(clients)
                            .where(and(
                                eq(clients.organizationId, ids.organizationId),
                                eq(clients.id, clientId)
                            ))

    if (!client) {
        throw new AppError('Client is not found', 404)
    }

    // Store invoice item values as a snapshot, so old invoices do not change
    // when a product price, tax rate, or description is updated later.

    // Calculate trusted totals on the server instead of accepting totals from the client.
    const {
        calculatedItems,
        subtotal,
        taxAmount,
        discountAmount,
        total
    } = calculateInvoiceItemsAndTotals(items)
    const totalPaid = Number(amountPaid ?? 0)

    if (totalPaid > total) {
        throw new AppError('Amount paid cannot be greater than invoice total.', 400)
    }

    const amountDue = total - totalPaid
    const finalStatus = amountDue === 0 ? 'paid' : status

    const finalInvoiceNumber = invoiceNumber ?? `INV-${Date.now()}`

    // Invoice and invoice items must be created together or rolled back together.
    const invoice = await db.transaction(async (tx) => {
    const [invoice] = await tx.insert(invoices)
                            .values({
                                clientId,
                                organizationId,
                                createdById: userId,
                                dueDate,
                                issueDate,
                                status: finalStatus,
                                currency,
                                subtotal: subtotal.toFixed(2),
                                taxAmount: taxAmount.toFixed(2),
                                discountAmount: discountAmount.toFixed(2),
                                total: total.toFixed(2),
                                amountPaid: totalPaid.toFixed(2),
                                amountDue: amountDue.toFixed(2),
                                paidAt: amountDue === 0 ? new Date() : undefined,
                                invoiceNumber: finalInvoiceNumber,
                                notes,
                                internalNotes,
                                footer,
                                pdfUrl
                            })
                            .returning()

    if (!invoice) {
        throw new AppError('Failed to create invoice.', 400)
    }

    await tx.insert(invoiceItems).values(
        calculatedItems.map((item) => ({
            invoiceId: invoice.id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            sortOrder: item.sortOrder
        }))
      )
     return invoice
    })

    return invoice
}

export const getInvoices = async (organizationId: number, query: unknown) => {
    if (organizationId === null) {
        throw new AppError('Organization id is required', 400)
    }

    const {
        filters,
        offSet,
        total,
        totalPages,
        limit,
        orderBy,
        page
    } = await invoiceFilter(organizationId, query)

    const existingInvoices = await db.query.invoices.findMany({
        where: and(...filters),
        columns: {
            id: true,
            invoiceNumber: true,
            status: true,
            currency: true,
            issueDate: true,
            dueDate: true,
            total: true,
            amountDue: true,
            amountPaid: true
        },
        with: {
            client: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    company: true
                }
            }
        },
        offset: offSet,
        orderBy,
        limit
    })

    return {
        invoices: existingInvoices,
        pagination: {
            total,
            totalPages,
            page,
            limit,
            hasNextPage: page < totalPages,
            hasPrevpage: page > 1
        }
    }
}

export const getSingleInvoice = async (ids: unknown) => {
    const parsed = GetSingleInvoiceSchema.safeParse(ids)

    if (!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { invoiceId, organizationId } = parsed.data

    const existingInvoice = await db.query.invoices.findFirst({
        where: and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, organizationId)
        ),
        columns: {
            id: true,
            invoiceNumber: true,
            status: true,
            currency: true,
            issueDate: true,
            dueDate: true,
            total: true,
            amountDue: true,
            amountPaid: true
        },
        with: {
            client: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    company: true
                }
            },
            items: {
                columns: {
                    id: true,
                    productId: true,
                    description: true,
                    quantity: true,
                    unitPrice: true,
                    taxRate: true,
                    discount: true,
                    total: true
                }
            }
        }
    })

    if (!existingInvoice) {
        throw new AppError('Invoice is not found.', 404)
    }

    return existingInvoice
}

export const updateInvoice = async (invoiceId: number, organizationId: number, data: unknown) => {
    const parsed = UpdateInvoiceSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {
        clientId,
        invoiceNumber,
        currency,
        status,
        notes,
        issueDate,
        dueDate,
        amountPaid,
        internalNotes,
        footer,
        pdfUrl,
        items
    } = parsed.data

    const updatedData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update')
    }

    // const updatedData = parsed.data

    // if(Object.values(updatedData).every((value) => value === undefined)) {
    //     throw new AppError('No fields to update.', 400)
    // }

    // const {
    //     clientId,
    //     invoiceNumber,
    //     currency,
    //     status,
    //     notes,
    //     issueDate,
    //     dueDate,
    //     amountPaid,
    //     internalNotes,
    //     footer,
    //     pdfUrl,
    //     items
    // } = updatedData

    const [existingInvoice] = await db.select()
                                      .from(invoices)
                                      .where(and(
                                        eq(invoices.id, invoiceId),
                                        eq(invoices.organizationId, organizationId)
                                      ))

    if (!existingInvoice) throw new AppError('Invoice not found', 404)

    if (clientId) {
        const [client] = await db.select({
            id: clients.id
        })
        .from(clients)
        .where(and(
            eq(clients.id, clientId),
            eq(clients.organizationId, organizationId)
        ))

        if (!client) {
            throw new AppError('Client is not found', 404)
        }
    }

    const invoiceUpdates: Record<string, unknown> = {
        clientId,
        invoiceNumber,
        currency,
        status,
        notes,
        issueDate,
        dueDate,
        internalNotes,
        footer,
        pdfUrl,
    }

    if (items) {
        const {
            calculatedItems,
            subtotal,
            taxAmount,
            discountAmount,
            total
        } = calculateInvoiceItemsAndTotals(items)

        const totalPaid = Number(amountPaid ?? existingInvoice.amountPaid ?? 0)

        if (totalPaid > total) {
            throw new AppError('Amount paid cannot be greater than invoice total.', 400)
        }

        const amountDue = total - totalPaid
        const finalStatus = amountDue === 0
            ? 'paid'
            : status ?? (existingInvoice.status === 'paid' ? 'draft' : existingInvoice.status)

        Object.assign(invoiceUpdates, {
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            total: total.toFixed(2),
            amountPaid: totalPaid.toFixed(2),
            amountDue: amountDue.toFixed(2),
            status: finalStatus,
            paidAt: amountDue === 0 ? new Date() : null,
        })

        const invoice = await db.transaction(async (tx) => {
            const [updatedInvoice] = await tx.update(invoices)
                .set(Object.fromEntries(
                    Object.entries(invoiceUpdates).filter(([_, value]) => hasValue(value))
                ))
                .where(and(
                    eq(invoices.id, invoiceId),
                    eq(invoices.organizationId, organizationId)
                ))
                .returning()

            if (!updatedInvoice) {
                throw new AppError('Failed to update invoice.', 400)
            }

            await tx.delete(invoiceItems)
                .where(eq(invoiceItems.invoiceId, invoiceId))

            await tx.insert(invoiceItems).values(
                calculatedItems.map((item) => ({
                    invoiceId,
                    productId: item.productId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate,
                    discount: item.discount,
                    total: item.total,
                    sortOrder: item.sortOrder
                }))
            )

            return updatedInvoice
        })

        return invoice
    }

    const totalPaid = amountPaid === undefined
        ? Number(existingInvoice.amountPaid ?? 0)
        : Number(amountPaid)
    const existingTotal = Number(existingInvoice.total)

    if (totalPaid > existingTotal) {
        throw new AppError('Amount paid cannot be greater than invoice total.', 400)
    }

    const amountDue = existingTotal - totalPaid
    const finalStatus = amountDue === 0
        ? 'paid'
        : status ?? (existingInvoice.status === 'paid' ? 'draft' : existingInvoice.status)

    Object.assign(invoiceUpdates, {
        amountPaid: totalPaid.toFixed(2),
        amountDue: amountDue.toFixed(2),
        status: finalStatus,
        paidAt: amountDue === 0 ? new Date() : null,
    })

    const [invoice] = await db.update(invoices)
        .set(Object.fromEntries(
            Object.entries(invoiceUpdates).filter(([_, value]) => hasValue(value))
        ))
        .where(and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, organizationId)
        ))
        .returning()

    if (!invoice) {
        throw new AppError('Failed to update invoice.', 400)
    }

    return invoice
}

export const deleteInvoice = async (ids: unknown) => {
    const parsed = DeleteInvoiceSchema.safeParse(ids)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msg, 400)
    }

    const { invoiceId, organizationId } = parsed.data

    const [existingInvoice] = await db.delete(invoices)
                                        .where(and(
                                            eq(invoices.id, invoiceId),
                                            eq(invoices.organizationId, organizationId)
                                        ))
                                        .returning({
                                            id: invoices.id
                                        })

    if (!existingInvoice) {
        throw new AppError('Invoice not found', 404)
    }

    return existingInvoice
}

import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm"
import { db } from "../db/db.js"
import { AppError } from "../utils/appError.js"
import { getFirstZodMessage } from "../utils/zodErrors.js"
import { CreatePaymentSchema, DeletePaymentSchema, GetPaymentSchema, PaymentsSchema, UpdatePaymentSchema } from "../validation/payments.validation.js"
import { invoices, payments } from "../db/schema.js"

export const createPayment = async (data: unknown) => {
    const parsed = CreatePaymentSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {
        invoiceId,
        organizationId,
        amount,
        method,
        reference,
        note,
        paidAt
    } = parsed.data

    const existingInvoice = await db.query.invoices.findFirst({
        where: and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, organizationId)
        ),
        columns: {
            id: true,
            currency: true,
            status: true,
            total: true,
            amountPaid: true,
        }
    })

    if(!existingInvoice) throw new AppError('Invoice not found.', 404)

    const existingAmountPaid = Number(existingInvoice.amountPaid ?? 0)
    const paymentAmount = Number(amount)
    const total = Number(existingInvoice.total)
    const newAmountPaid = existingAmountPaid + paymentAmount

    if (newAmountPaid > total) {
        throw new AppError('Payment amount cannot be greater than the invoice amount due.', 400)
    }

    const amountDue = total - newAmountPaid
    const status = amountDue === 0 ? 'paid' : existingInvoice.status

    const payment = await db.transaction(async (tx) => {
        const [createdPayment] = await tx.insert(payments)
                            .values({
                                invoiceId,
                                organizationId,
                                amount,
                                currency: existingInvoice.currency,
                                method,
                                reference,
                                note,
                                paidAt,
                            })
                            .returning()

        if (!createdPayment) {
            throw new AppError('Failed to create payment.', 400)
        }

        await tx.update(invoices)
            .set({
                amountPaid: newAmountPaid.toFixed(2),
                amountDue: amountDue.toFixed(2),
                status,
                paidAt: amountDue === 0 ? paidAt : null,
                updatedAt: new Date()
            })
            .where(and(
                eq(invoices.id, invoiceId),
                eq(invoices.organizationId, organizationId)
            ))

        return createdPayment
    })

    if (!payment) {
        throw new AppError('Failed to create payment.', 400)
    }

    return payment
}

export const getAllPayments = async (organizationId: number, query: unknown) => {
    if (!Number.isInteger(organizationId) || organizationId <= 0) {
        throw new AppError('Organization id is required.', 400)
    }

    const parsed = PaymentsSchema.safeParse(query)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {
        search,
        page,
        limit,
        sortBy,
        sortOrder,
        createdFrom,
        createdTo
    } = parsed.data

    const filters: SQL[] = [
        eq(payments.organizationId, organizationId)
    ]

    if (search) {
        filters.push(or(
            ilike(payments.reference, `%${search}%`),
            ilike(payments.note, `%${search}%`),
            ilike(invoices.invoiceNumber, `%${search}%`)
        )!)
    }

    if (createdFrom) {
        filters.push(gte(payments.createdAt, createdFrom))
    }

    if (createdTo) {
        filters.push(lte(payments.createdAt, createdTo))
    }

    const sortColumn = {
        createdAt: payments.createdAt
    }[sortBy]
    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)
    const offset = (page - 1) * limit

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .where(and(...filters))

    const total = Number(count)
    const totalPages = Math.ceil(total / limit)

    const allPayments = await db.select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        amount: payments.amount,
        currency: payments.currency,
        method: payments.method,
        reference: payments.reference,
        note: payments.note,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
    })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .where(and(...filters))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset)

    return {
        payments: allPayments,
        pagination: {
            total,
            totalPages,
            page,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    }
}

export const getPayment = async (ids: unknown) => {
    const parsed = GetPaymentSchema.safeParse(ids)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msg, 400)
    }

    const { organizationId, paymentId} = parsed.data

    const existingPayment = await db.query.payments.findFirst({
        where: and(
            eq(payments.id, paymentId),
            eq(payments.organizationId, organizationId)
        ),
        columns: {
            organizationId: false,
        },
        with: {
            invoice: {
                columns: {
                    id: true,
                    total: true,
                    amountDue: true,
                    currency: true,
                    status: true,
                    invoiceNumber: true,
                    amountPaid: true
                },
                with: {
                    client: {
                        columns: {
                            name: true,
                            email: true,
                            contactPhone: true
                        }
                    }
                }
            }
        }
    })

    if(!existingPayment) {
        throw new AppError('Payment not found.', 400)
    }

    return existingPayment
}

type PaymentIds = {
    paymentId: number,
    organizationId: number
}

export const updatePayment = async (ids: PaymentIds, data: unknown) => {
    const parsed = UpdatePaymentSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const updatedData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    )

    if(Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update.', 400)
    }

    const {
        amount,
        paidAt
    } = parsed.data

    const existingPayment = await db.query.payments.findFirst({
        where: and(
            eq(payments.id, ids.paymentId),
            eq(payments.organizationId, ids.organizationId)
        ),
        columns: {
            id: true,
            amount: true
        },
        with: {
            invoice: {
                columns: {
                    id: true,
                    total: true,
                    amountPaid: true,
                    status: true,
                    amountDue: true,
                    paidAt: true
                }
            }
        }
    })
    
    if (!existingPayment) {
        throw new AppError('Payment is not found.', 404)
    }

    const previousPaymentAmount = Number(existingPayment.amount)
    const nextPaymentAmount = amount === undefined ? previousPaymentAmount : Number(amount)
    const invoiceAmountPaid = Number(existingPayment.invoice.amountPaid ?? 0)
    const invoiceTotal = Number(existingPayment.invoice.total)
    const amountPaidInvoice = invoiceAmountPaid - previousPaymentAmount + nextPaymentAmount

    if(amountPaidInvoice > invoiceTotal) {
        throw new AppError('Payment amount cannot be greater than the invoice amount due.', 400)
    }

    const amountDue = invoiceTotal - amountPaidInvoice

    const invoiceStatus = amountDue === 0
        ? 'paid'
        : existingPayment.invoice.status === 'paid'
            ? 'sent'
            : existingPayment.invoice.status
    
    const payment = await db.transaction(async (tx) => {
        const [updatedPayment] = await tx.update(payments)
                                        .set(updatedData)
                                        .where(and(
                                            eq(payments.id, ids.paymentId),
                                            eq(payments.organizationId, ids.organizationId)
                                        ))
                                        .returning()

        if (!updatedPayment) throw new AppError('Failed to update payment.', 400)

        await tx.update(invoices)
            .set({
                amountPaid: amountPaidInvoice.toFixed(2),
                amountDue: amountDue.toFixed(2),
                status: invoiceStatus,
                paidAt: amountDue === 0
                    ? paidAt ?? existingPayment.invoice.paidAt ?? new Date()
                    : null,
                updatedAt: new Date()
            })
            .where(and(
                eq(invoices.id, existingPayment.invoice.id),
                eq(invoices.organizationId, ids.organizationId)
            ))

        return updatedPayment
    })

    return payment
}

export const deletePayment = async (ids: unknown) => {
    const parsed = DeletePaymentSchema.safeParse(ids)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {organizationId, paymentId} = parsed.data

    const [existingPayment] = await db.delete(payments)
                                        .where(and(
                                            eq(payments.id, paymentId),
                                            eq(payments.organizationId, organizationId)
                                        ))
                                        .returning( {
                                            id: payments.id
                                        })

    if(!existingPayment) {
        throw new AppError('Payment is not found.', 404)
    }

    return existingPayment
}

import { and, eq } from "drizzle-orm"
import { db } from "../db/db.js"
import { AppError } from "../utils/appError.js"
import { ExportInvoiceSchema } from "../validation/export.validation.js"
import { invoices } from "../db/schema.js"

export const ExportInvoice = async (ids: unknown) => {
    const parsed = ExportInvoiceSchema.safeParse(ids)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msg, 400)
    }

    const { invoiceId, organizationId } = parsed.data

    const existingInvoice = await db.query.invoices.findFirst({
        where: and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, organizationId)
        ),
        columns: {
            invoiceNumber: true,
            internalNotes: true,
            notes: true,
            footer: true,
            discountAmount: true,
            dueDate: true,
            issueDate: true,
            subtotal: true,
            taxAmount: true,
            total: true,
            amountDue: true,
            amountPaid: true
        },
        with: {
            client: {
                columns: {
                    name: true,
                    email: true,
                    company: true
                }
            },
            items: {
                columns: {
                    description: true,
                    quantity: true,
                    unitPrice: true,
                    discount: true,
                    taxRate: true,
                    total: true
                }
            }
        }
    })

    if(!existingInvoice) {
        throw new AppError('Invoice not found', 404)
    }

    return existingInvoice
}
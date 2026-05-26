import { and, eq } from "drizzle-orm"
import PDFDocument from "pdfkit"
import { db } from "../db/db.js"
import { AppError } from "../utils/appError.js"
import { ExportInvoiceSchema } from "../validation/export.validation.js"
import { invoices } from "../db/schema.js"
import {
    drawPageHeader,
    drawPartyAndDetails,
    drawTableHeader,
    drawItemRow,
    drawTotals,
    drawNotes,
    drawFooter,
    drawPageNumber,
    getPdfBuffer,
    shouldAddPage,
} from "../utils/invoicePdf.utils.js" 

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatDate = (value: Date | string | null) => {
    if (!value) return 'Not set'
    return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(value))
}

const formatMoney = (currency: string | null | undefined, value: string | number | null | undefined) => {
    return `${currency ?? 'PHP'} ${Number(value ?? 0).toFixed(2)}`
}

const sanitizeFilename = (value: string) => {
    return value.replace(/[^a-z0-9-_]/gi, '_')
}

// ─── DB query ─────────────────────────────────────────────────────────────────

export const ExportInvoice = async (ids: unknown) => {
    const parsed = ExportInvoiceSchema.safeParse(ids)

    if (!parsed.success) {
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
            currency: true,
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
                columns: { name: true, email: true, company: true }
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

    if (!existingInvoice) throw new AppError('Invoice not found', 404)

    return existingInvoice
}

type ExportInvoiceData = Awaited<ReturnType<typeof ExportInvoice>>

// ─── PDF generator ────────────────────────────────────────────────────────────

export const generateInvoicePdf = async (ids: unknown) => {
    const invoice = await ExportInvoice(ids)
    const currency = invoice.currency ?? 'PHP'

    const doc = new PDFDocument({ size: 'A4', margin: 48, autoFirstPage: true })
    const bufferPromise = getPdfBuffer(doc)

    // 1. Page header (blue bar + "INVOICE" title + invoice number)
    let y = drawPageHeader(doc, invoice.invoiceNumber)

    // 2. Bill-to + invoice details card
    y = drawPartyAndDetails(doc, y, {
        name:    invoice.client?.name    ?? 'Client',
        email:   invoice.client?.email   ?? '',
        company: invoice.client?.company ?? '',
    }, {
        issueDate: formatDate(invoice.issueDate),
        dueDate:   formatDate(invoice.dueDate),
        amountDue: formatMoney(currency, invoice.amountDue),
    })

    // 3. Items table header
    y = drawTableHeader(doc, y)

    // 4. Item rows
    let page = 1
    invoice.items.forEach((item, i) => {
        if (shouldAddPage(y, 70)) {
            drawPageNumber(doc, page)
            doc.addPage()
            page += 1
            y = drawTableHeader(doc, 48)
        }

        y = drawItemRow(doc, y, i, {
            description: item.description,
            quantity:    item.quantity,
            unitPrice:   formatMoney(currency, item.unitPrice),
            taxRate:     item.taxRate,
            total:       formatMoney(currency, item.total),
        })
    })

    // 5. Totals block
    if (shouldAddPage(y, 170)) {
        drawPageNumber(doc, page)
        doc.addPage()
        page += 1
        y = 48
    }

    y = drawTotals(doc, y + 12, {
        subtotal:    formatMoney(currency, invoice.subtotal),
        discount:    formatMoney(currency, invoice.discountAmount),
        tax:         formatMoney(currency, invoice.taxAmount),
        total:       formatMoney(currency, invoice.total),
        amountPaid:  formatMoney(currency, invoice.amountPaid),
        amountDue:   formatMoney(currency, invoice.amountDue),
    })

    // 6. Notes
    if (invoice.notes) {
        if (shouldAddPage(y, 110)) {
            drawPageNumber(doc, page)
            doc.addPage()
            page += 1
            y = 48
        }
        y = drawNotes(doc, y + 16, invoice.notes)
    }

    // 7. Footer
    if (invoice.footer) {
        if (shouldAddPage(y, 50)) {
            drawPageNumber(doc, page)
            doc.addPage()
            page += 1
            y = 48
        }
        drawFooter(doc, y + 12, invoice.footer)
    }

    drawPageNumber(doc, page)
    doc.end()

    return {
        filename: `${sanitizeFilename(invoice.invoiceNumber)}.pdf`,
        buffer: await bufferPromise,
    }
}

import PDFDocument from "pdfkit"

const COLORS = {
    ink: '#111827',
    muted: '#6B7280',
    faint: '#F8FAFC',
    panel: '#F1F5F9',
    line: '#E5E7EB',
    accent: '#2563EB',
    accentDark: '#1E40AF',
    success: '#047857',
    white: '#FFFFFF',
}

const PAGE_MARGIN = 48
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const CONTENT_W = PAGE_WIDTH - PAGE_MARGIN * 2
const BOTTOM_LIMIT = PAGE_HEIGHT - 88

const COL = {
    desc: { x: PAGE_MARGIN, w: 218 },
    qty: { x: PAGE_MARGIN + 228, w: 44 },
    unit: { x: PAGE_MARGIN + 282, w: 74 },
    tax: { x: PAGE_MARGIN + 366, w: 48 },
    total: { x: PAGE_MARGIN + 424, w: 75 },
}

function fillRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
    doc.save().rect(x, y, w, h).fill(color).restore()
}

function strokeRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color = COLORS.line) {
    doc.save().rect(x, y, w, h).strokeColor(color).lineWidth(0.7).stroke().restore()
}

function hRule(doc: PDFKit.PDFDocument, y: number, color = COLORS.line, x = PAGE_MARGIN, width = CONTENT_W) {
    doc.save().moveTo(x, y).lineTo(x + width, y).strokeColor(color).lineWidth(0.7).stroke().restore()
}

function textRight(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    options: PDFKit.Mixins.TextOptions = {},
) {
    doc.text(text, x, y, { width, align: 'right', ...options })
}

function label(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width = 120) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted).text(text.toUpperCase(), x, y, {
        width,
        characterSpacing: 0.4,
    })
}

export function shouldAddPage(y: number, neededHeight = 80) {
    return y + neededHeight > BOTTOM_LIMIT
}

export function drawPageHeader(doc: PDFKit.PDFDocument, invoiceNumber: string) {
    fillRect(doc, 0, 0, PAGE_WIDTH, 5, COLORS.accent)

    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink).text('Singil', PAGE_MARGIN, 30)
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text('Billing workspace', PAGE_MARGIN, 45)

    doc.font('Helvetica-Bold').fontSize(28).fillColor(COLORS.ink)
    textRight(doc, 'INVOICE', PAGE_MARGIN, 28, CONTENT_W)

    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted)
    textRight(doc, invoiceNumber, PAGE_MARGIN, 61, CONTENT_W)

    hRule(doc, 86)
    doc.fillColor(COLORS.ink)
    return 108
}

export function drawPartyAndDetails(
    doc: PDFKit.PDFDocument,
    startY: number,
    billTo: { name: string; email: string; company: string },
    details: { issueDate: string; dueDate: string; amountDue: string },
) {
    const cardH = 112
    const gap = 14
    const leftW = 260
    const rightW = CONTENT_W - leftW - gap
    const rightX = PAGE_MARGIN + leftW + gap

    fillRect(doc, PAGE_MARGIN, startY, leftW, cardH, COLORS.faint)
    strokeRect(doc, PAGE_MARGIN, startY, leftW, cardH)
    fillRect(doc, rightX, startY, rightW, cardH, COLORS.faint)
    strokeRect(doc, rightX, startY, rightW, cardH)

    label(doc, 'Bill to', PAGE_MARGIN + 14, startY + 14)
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.ink)
        .text(billTo.name || 'Client', PAGE_MARGIN + 14, startY + 32, { width: leftW - 28 })
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
    if (billTo.company) doc.text(billTo.company, PAGE_MARGIN + 14, doc.y + 5, { width: leftW - 28 })
    if (billTo.email) doc.text(billTo.email, PAGE_MARGIN + 14, doc.y + 3, { width: leftW - 28 })

    label(doc, 'Invoice details', rightX + 14, startY + 14, rightW - 28)

    const rows: [string, string, boolean?][] = [
        ['Issue date', details.issueDate],
        ['Due date', details.dueDate],
        ['Amount due', details.amountDue, true],
    ]

    let rowY = startY + 34
    rows.forEach(([name, value, highlight]) => {
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(name, rightX + 14, rowY)
        doc.font(highlight ? 'Helvetica-Bold' : 'Helvetica').fontSize(highlight ? 11 : 9).fillColor(highlight ? COLORS.accentDark : COLORS.ink)
        textRight(doc, value, rightX + 94, rowY, rightW - 108)
        rowY += highlight ? 22 : 18
    })

    doc.fillColor(COLORS.ink)
    return startY + cardH + 26
}

export function drawTableHeader(doc: PDFKit.PDFDocument, startY: number) {
    const rowH = 26
    fillRect(doc, PAGE_MARGIN, startY, CONTENT_W, rowH, COLORS.panel)
    strokeRect(doc, PAGE_MARGIN, startY, CONTENT_W, rowH)

    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    doc.text('DESCRIPTION', COL.desc.x + 8, startY + 9, { characterSpacing: 0.35 })
    textRight(doc, 'QTY', COL.qty.x, startY + 9, COL.qty.w, { characterSpacing: 0.35 })
    textRight(doc, 'UNIT', COL.unit.x, startY + 9, COL.unit.w, { characterSpacing: 0.35 })
    textRight(doc, 'TAX', COL.tax.x, startY + 9, COL.tax.w, { characterSpacing: 0.35 })
    textRight(doc, 'TOTAL', COL.total.x, startY + 9, COL.total.w, { characterSpacing: 0.35 })

    doc.fillColor(COLORS.ink)
    return startY + rowH
}

export function drawItemRow(
    doc: PDFKit.PDFDocument,
    startY: number,
    rowIndex: number,
    item: {
        description: string
        quantity: string | number
        unitPrice: string
        taxRate: string | number | null
        total: string
    },
) {
    const descHeight = Math.max(doc.heightOfString(item.description, { width: COL.desc.w - 16 }), 14)
    const rowH = Math.max(descHeight + 18, 34)

    if (rowIndex % 2 === 1) {
        fillRect(doc, PAGE_MARGIN, startY, CONTENT_W, rowH, COLORS.faint)
    }

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.ink)
    doc.text(item.description, COL.desc.x + 8, startY + 10, { width: COL.desc.w - 16 })

    const valueY = startY + 10
    doc.fillColor(COLORS.muted)
    textRight(doc, String(item.quantity), COL.qty.x, valueY, COL.qty.w)
    textRight(doc, item.unitPrice, COL.unit.x, valueY, COL.unit.w)
    textRight(doc, `${item.taxRate ?? '0'}%`, COL.tax.x, valueY, COL.tax.w)

    doc.font('Helvetica-Bold').fillColor(COLORS.ink)
    textRight(doc, item.total, COL.total.x, valueY, COL.total.w)
    hRule(doc, startY + rowH)

    doc.font('Helvetica').fillColor(COLORS.ink)
    return startY + rowH
}

export function drawTotals(
    doc: PDFKit.PDFDocument,
    startY: number,
    totals: {
        subtotal: string
        discount: string
        tax: string
        total: string
        amountPaid: string
        amountDue: string
    },
) {
    const boxW = 236
    const boxX = PAGE_WIDTH - PAGE_MARGIN - boxW
    const rowH = 22
    const rows: Array<{ label: string; value: string; bold?: boolean; accent?: boolean }> = [
        { label: 'Subtotal', value: totals.subtotal },
        { label: 'Discount', value: totals.discount },
        { label: 'Tax', value: totals.tax },
        { label: 'Total', value: totals.total, bold: true },
        { label: 'Amount paid', value: totals.amountPaid },
        { label: 'Amount due', value: totals.amountDue, bold: true, accent: true },
    ]

    const boxH = rows.length * rowH + 18
    fillRect(doc, boxX, startY, boxW, boxH, COLORS.faint)
    strokeRect(doc, boxX, startY, boxW, boxH)

    let y = startY + 10
    rows.forEach((row) => {
        if (row.accent) {
            fillRect(doc, boxX, y - 5, boxW, rowH + 5, COLORS.accent)
            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.white)
        } else {
            doc.font(row.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(row.bold ? COLORS.ink : COLORS.muted)
        }

        doc.text(row.label, boxX + 12, y, { width: 96 })
        textRight(doc, row.value, boxX + 112, y, boxW - 124)
        y += rowH
    })

    doc.fillColor(COLORS.ink).font('Helvetica')
    return startY + boxH + 18
}

export function drawNotes(doc: PDFKit.PDFDocument, startY: number, notes: string) {
    const width = CONTENT_W
    label(doc, 'Notes', PAGE_MARGIN, startY, width)
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
        .text(notes, PAGE_MARGIN, startY + 14, { width, lineGap: 2 })

    const h = doc.heightOfString(notes, { width, lineGap: 2 })
    doc.fillColor(COLORS.ink)
    return startY + 14 + h + 18
}

export function drawFooter(doc: PDFKit.PDFDocument, startY: number, footer: string) {
    hRule(doc, startY)
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
        .text(footer, PAGE_MARGIN, startY + 10, { width: CONTENT_W, align: 'center' })
    doc.fillColor(COLORS.ink)
}

export function drawPageNumber(doc: PDFKit.PDFDocument, page: number) {
    const y = doc.page.height - 34
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
    textRight(doc, `Page ${page}`, PAGE_MARGIN, y, CONTENT_W)
    doc.fillColor(COLORS.ink)
}

export const getPdfBuffer = (doc: PDFKit.PDFDocument): Promise<Buffer> =>
    new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
    })

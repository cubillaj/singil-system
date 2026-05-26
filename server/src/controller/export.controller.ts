import * as ExportServices from '../services/export.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'

export const exportInvoiceController = async (req: Request, res: Response) => {
    try {
        const invoiceId = Number(req.params.invoiceId)

        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                message: 'Invoice id is required'
            })
        }

        const session = req.authSession!

        const { organizationId} = session

        if (organizationId === null || typeof organizationId !== 'number') {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const invoice = await ExportServices.ExportInvoice({
            invoiceId,
            organizationId
        })

        return res.status(200).json({
            invoice
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const exportInvoicePdfController = async (req: Request, res: Response) => {
    try {
        const invoiceId = Number(req.params.invoiceId)

        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                message: 'Invoice id is required'
            })
        }

        const session = req.authSession!
        const { organizationId } = session

        if (organizationId === null || typeof organizationId !== 'number') {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const pdf = await ExportServices.generateInvoicePdf({
            invoiceId,
            organizationId
        })

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`)

        return res.status(200).send(pdf.buffer)
    } catch (error) {
        return handleControllererror(res, error)
    }
}

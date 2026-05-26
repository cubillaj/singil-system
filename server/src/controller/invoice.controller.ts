import * as InvoicesServices from '../services/invoices.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'
export const createInvoiceController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        const { userId, organizationId} = session

        if(!userId) return res.status(400).json({ message: 'User id is required'})
        if(!organizationId) return res.status(400).json({ message: 'Organization id is required'})

        if(typeof organizationId !== 'number') return res.status(400).json({ message: 'Organization id is required'})
        if(typeof userId !== 'number') return res.status(400).json({ message: 'User id is required'})

        const invoice = await InvoicesServices.createInvoice({
                organizationId,
                userId
        },
           { ...req.body }
        )

        return res.status(201).json({
            message: 'Successfully created invoice.',
            invoice
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getInvoicesController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if (session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const invoices = await InvoicesServices.getInvoices(session.organizationId, req.query)

        return res.status(200).json({
            ...invoices
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getInvoiceController = async (req: Request, res: Response) => {
    try {
        const invoiceId = Number(req.params.invoiceId)

        if(!invoiceId) return res.status(400).json({ message: 'Invoice id is required'})

        const session = req.authSession!

        const { organizationId} = session

        if(typeof organizationId !== 'number' || organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required.'
            })
        }

        const invoice = await InvoicesServices.getSingleInvoice({ invoiceId, organizationId})

        return res.status(200).json({
            invoice
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const updateInvoiceController = async (req: Request, res: Response) => {
    try {
        const invoiceId = Number(req.params.invoiceId)

        if(!invoiceId) return res.status(400).json({ message: 'Invoice id is required'})

        const session = req.authSession!
        const { organizationId } = session

        if(typeof organizationId !== 'number' || organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required.'
            })
        }

        const invoice = await InvoicesServices.updateInvoice(invoiceId, organizationId, req.body)

        return res.status(200).json({
            message: 'Successfully updated invoice.',
            invoice
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const deleteInvoiceController = async (req: Request, res: Response) => {
    try {
        const invoiceId = Number(req.params.invoiceId)

        if(!invoiceId) return res.status(400).json({message: 'Invoice id is required.'})

        const session = req.authSession!

        if(session.organizationId === null) return res.status(400).json({message: 'Organization id is required'})

        await InvoicesServices.deleteInvoice({
            invoiceId,
            organizationId: session.organizationId
        })

        return res.status(200).json({
            message: 'Successfully deleted invoice.'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

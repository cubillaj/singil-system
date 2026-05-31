import * as PaymentService from '../services/payment.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'
export const getAllPaymentsController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required.'
            })
        }

        const payments = await PaymentService.getAllPayments(session.organizationId, req.query)

        return res.status(200).json({
            ...payments
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const createPaymentController = async (req: Request, res: Response) => {
    try {
        const invoiceId = Number(req.params.invoiceId)
        const session = req.authSession!

        const { organizationId } = session

        if(invoiceId <= 0) {
            return res.status(400).json({
                message: 'Invoice id is required.'
            })
        }

        if(organizationId === null) {
            return res.status(400).json({
                message: "Organization id is required."
            })
        }

        const payment = await PaymentService.createPayment({
            invoiceId,
            organizationId,
            ...req.body
        })

        return res.status(201).json({
            message: 'Successfully created payment.',
            payment
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getPaymentController = async (req: Request, res: Response) => {
    try {
        const paymentId = Number(req.params.paymentId)

        if(paymentId <= 0) {
            return res.status(400).json({
                message: 'Payment id is required'
            })
        }

        const session = req.authSession!

        const { organizationId} = session

        if (organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required.'
            })
        }

        const payment = await PaymentService.getPayment({
            paymentId,
            organizationId
        })

        return res.status(200).json({
            payment
        })
    } catch(error) {
        return handleControllererror(res, error)
    }
}

export const updatePaymentController = async (req: Request, res: Response) => {
    try {
        const paymentId = Number(req.params.paymentId)

        if(paymentId <= 0) {
            return res.status(400).json({
                message: 'Payment id is required'
            })
        }

        const session = req.authSession!
        const { organizationId } = session

        if (organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required.'
            })
        }

        const payment = await PaymentService.updatePayment({
            paymentId,
            organizationId
        }, req.body)

        return res.status(200).json({
            message: 'Successfully updated payment.',
            payment
        })
    } catch(error) {
        return handleControllererror(res, error)
    }
}

export const deletePaymentController = async (req: Request, res: Response) => {
    try {
        const paymentId = Number(req.params.paymentId)

        if(paymentId <= 0) return res.status(400).json({message: 'Payment id is required.'})

        const session = req.authSession!

        if(session.organizationId === null) return res.status(400).json({message: 'Organization id is required.'})

        await PaymentService.deletePayment({
            paymentId,
            organizationId: session.organizationId
        })

        return res.status(200).json({
            message: 'Successfully delete a payment.'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

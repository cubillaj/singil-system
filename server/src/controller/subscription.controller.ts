import * as SubscriptionServices from '../services/paymongo.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'

export const subscriptionCheckoutController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.organizationId === null) return res.status(400).json({ message: 'Organization id is required.'})

        const checkout = await SubscriptionServices.subscriptionCheckout({
            organizationId: session.organizationId,
            userId: session.userId,
            ...req.body
        })

        return res.status(201).json({
            message: "Successfully created a checkout.",
            checkout
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}
import * as SubscriptionServices from '../services/paymongo.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'
import { cancelSubscriptionAtPeriodEnd, getPlanCatalog, resumeSubscription } from '../services/subscription.services.js'

export const getSubscriptionPlansController = (_req: Request, res: Response) => {
    return res.status(200).json({ plans: getPlanCatalog() })
}

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

export const cancelSubscriptionController = async (req: Request, res: Response) => {
    try {
        const organizationId = req.authSession?.organizationId
        if (organizationId == null) return res.status(400).json({ message: 'Organization id is required.' })

        const subscription = await cancelSubscriptionAtPeriodEnd(organizationId)
        return res.status(200).json({
            message: 'Subscription cancellation scheduled successfully.',
            subscription
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const resumeSubscriptionController = async (req: Request, res: Response) => {
    try {
        const organizationId = req.authSession?.organizationId
        if (organizationId == null) return res.status(400).json({ message: 'Organization id is required.' })

        const subscription = await resumeSubscription(organizationId)
        return res.status(200).json({
            message: 'Subscription resumed successfully.',
            subscription
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

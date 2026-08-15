import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { cancelSubscriptionController, getSubscriptionPlansController, resumeSubscriptionController, subscriptionCheckoutController } from '../controller/subscription.controller.js'
import { readRateLimiter, sensitiveActionRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()

router.get('/plans', readRateLimiter, getSubscriptionPlansController)

router.post('/', sensitiveActionRateLimiter, requireRole(['owner']), auditLogMiddleware({
    action: 'subscription.checkout',
    entityType: 'subscription',
    getMetadata: (req) => ({ plan: req.body?.plan })
}), subscriptionCheckoutController)

router.post('/cancel', sensitiveActionRateLimiter, requireRole(['owner']), auditLogMiddleware({
    action: 'subscription.cancel',
    entityType: 'subscription'
}), cancelSubscriptionController)

router.post('/resume', sensitiveActionRateLimiter, requireRole(['owner']), auditLogMiddleware({
    action: 'subscription.resume',
    entityType: 'subscription'
}), resumeSubscriptionController)

export default router

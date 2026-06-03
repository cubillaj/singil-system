import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { subscriptionCheckoutController } from '../controller/subscription.controller.js'
import { sensitiveActionRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()

router.post('/', sensitiveActionRateLimiter, requireRole(['owner']), auditLogMiddleware({
    action: 'subscription.checkout',
    entityType: 'subscription',
    getMetadata: (req) => ({ plan: req.body?.plan })
}), subscriptionCheckoutController)

export default router

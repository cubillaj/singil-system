import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { subscriptionCheckoutController } from '../controller/subscription.controller.js'
import { sensitiveActionRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()

router.post('/', sensitiveActionRateLimiter, requireRole(['owner']), subscriptionCheckoutController)

export default router

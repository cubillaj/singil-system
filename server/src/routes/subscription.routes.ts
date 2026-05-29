import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { subscriptionCheckoutController } from '../controller/subscription.controller.js'

const router = express.Router()

router.post('/', requireRole(['owner']), subscriptionCheckoutController)

export default router
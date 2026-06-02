import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createPaymentController, deletePaymentController, getAllPaymentsController, getPaymentController, updatePaymentController } from '../controller/payment.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()

router.get('/', readRateLimiter, requireRole(['admin', 'member', 'owner']), getAllPaymentsController)
router.post('/:invoiceId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), createPaymentController)
router.get('/:paymentId', readRateLimiter, requireRole(['admin', 'member', 'owner']), getPaymentController)
router.put('/:paymentId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), updatePaymentController)
router.delete('/:paymentId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), deletePaymentController)

export default router

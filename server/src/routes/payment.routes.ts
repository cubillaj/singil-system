import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createPaymentController, deletePaymentController, getAllPaymentsController, getPaymentController, updatePaymentController } from '../controller/payment.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()

router.get('/', readRateLimiter, requireRole(['admin', 'member', 'owner']), getAllPaymentsController)
router.post('/:invoiceId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), auditLogMiddleware({
    action: 'payment.create',
    entityType: 'payment',
    getMetadata: (req) => ({ invoiceId: Number(req.params.invoiceId), amount: req.body?.amount, method: req.body?.method })
}), createPaymentController)
router.get('/:paymentId', readRateLimiter, requireRole(['admin', 'member', 'owner']), getPaymentController)
router.put('/:paymentId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), auditLogMiddleware({
    action: 'payment.update',
    entityType: 'payment',
    entityIdParam: 'paymentId'
}), updatePaymentController)
router.delete('/:paymentId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), auditLogMiddleware({
    action: 'payment.delete',
    entityType: 'payment',
    entityIdParam: 'paymentId'
}), deletePaymentController)

export default router

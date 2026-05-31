import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createPaymentController, deletePaymentController, getAllPaymentsController, getPaymentController, updatePaymentController } from '../controller/payment.controller.js'

const router = express.Router()

router.get('/', requireRole(['admin', 'member', 'owner']), getAllPaymentsController)
router.post('/:invoiceId', requireRole(['admin', 'member', 'owner']), createPaymentController)
router.get('/:paymentId', requireRole(['admin', 'member', 'owner']), getPaymentController)
router.put('/:paymentId', requireRole(['admin', 'member', 'owner']), updatePaymentController)
router.delete('/:paymentId', requireRole(['admin', 'member', 'owner']), deletePaymentController)

export default router

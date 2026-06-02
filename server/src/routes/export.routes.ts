import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { exportInvoiceController, exportInvoicePdfController } from '../controller/export.controller.js'
import { exportRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()

router.get('/:invoiceId/pdf', exportRateLimiter, requireRole(['admin', 'owner', 'member']), exportInvoicePdfController)
router.get('/:invoiceId', exportRateLimiter, requireRole(['admin', 'owner', 'member']), exportInvoiceController)

export default router

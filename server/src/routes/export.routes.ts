import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { exportInvoiceController, exportInvoicePdfController } from '../controller/export.controller.js'

const router = express.Router()

router.get('/:invoiceId/pdf', requireRole(['admin', 'owner', 'member']), exportInvoicePdfController)
router.get('/:invoiceId', requireRole(['admin', 'owner', 'member']), exportInvoiceController)

export default router

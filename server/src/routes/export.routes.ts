import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { exportInvoiceController } from '../controller/export.controller.js'

const router = express.Router()

router.get('/:invoiceId', requireRole(['admin', 'owner', 'member']), exportInvoiceController)

export default router

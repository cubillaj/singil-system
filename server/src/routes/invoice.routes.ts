import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createInvoiceController, deleteInvoiceController, getInvoiceController, getInvoicesController, updateInvoiceController } from '../controller/invoice.controller.js'

const router = express.Router()
router.get('/', requireRole(['admin', 'member','owner']), getInvoicesController)
router.post('/', requireRole(['admin', 'member','owner']), createInvoiceController)
router.get('/:invoiceId', requireRole(['admin', 'member','owner']), getInvoiceController)
router.put('/:invoiceId', requireRole(['admin', 'member','owner']), updateInvoiceController)
router.delete('/:invoiceId', requireRole(['admin', 'member','owner']), deleteInvoiceController)

export default router

import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createInvoiceController, deleteInvoiceController, getInvoiceController, getInvoicesController, updateInvoiceController } from '../controller/invoice.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()
router.get('/', readRateLimiter, requireRole(['admin', 'member','owner']), getInvoicesController)
router.post('/', writeRateLimiter, requireRole(['admin', 'member','owner']), createInvoiceController)
router.get('/:invoiceId', readRateLimiter, requireRole(['admin', 'member','owner']), getInvoiceController)
router.put('/:invoiceId', writeRateLimiter, requireRole(['admin', 'member','owner']), updateInvoiceController)
router.delete('/:invoiceId', writeRateLimiter, requireRole(['admin', 'member','owner']), deleteInvoiceController)

export default router

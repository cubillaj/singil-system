import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createInvoiceController, deleteInvoiceController, getInvoiceController, getInvoicesController, updateInvoiceController } from '../controller/invoice.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()
const invoiceAuditMetadata = (req: express.Request) => ({
    invoiceNumber: req.body?.invoiceNumber,
    status: req.body?.status,
    clientId: req.body?.clientId,
    itemCount: Array.isArray(req.body?.items) ? req.body.items.length : undefined
})

router.get('/', readRateLimiter, requireRole(['admin', 'member','owner']), getInvoicesController)
router.post(
    '/',
    writeRateLimiter,
    requireRole(['admin', 'member','owner']),
    auditLogMiddleware({
        action: 'invoice.create',
        entityType: 'invoice',
        getMetadata: invoiceAuditMetadata
    }),
    createInvoiceController
)
router.get('/:invoiceId', readRateLimiter, requireRole(['admin', 'member','owner']), getInvoiceController)
router.put(
    '/:invoiceId',
    writeRateLimiter,
    requireRole(['admin', 'member','owner']),
    auditLogMiddleware({
        action: 'invoice.update',
        entityType: 'invoice',
        entityIdParam: 'invoiceId',
        getMetadata: invoiceAuditMetadata
    }),
    updateInvoiceController
)
router.delete(
    '/:invoiceId',
    writeRateLimiter,
    requireRole(['admin', 'member','owner']),
    auditLogMiddleware({
        action: 'invoice.delete',
        entityType: 'invoice',
        entityIdParam: 'invoiceId'
    }),
    deleteInvoiceController
)

export default router

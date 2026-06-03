import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createClientController, deleteClientController, getAllClientsController, getSingleClientController, updateClientController } from '../controller/clients.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()
router.get('/', readRateLimiter, requireRole(['admin', 'member', 'owner']), getAllClientsController)
router.post('/', writeRateLimiter, requireRole(['admin', 'member', 'owner']), auditLogMiddleware({
    action: 'client.create',
    entityType: 'client',
    getMetadata: (req) => ({ name: req.body?.name, email: req.body?.email, company: req.body?.company })
}), createClientController)

router.put('/:clientId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), auditLogMiddleware({
    action: 'client.update',
    entityType: 'client',
    entityIdParam: 'clientId'
}), updateClientController)
router.get('/:clientId', readRateLimiter, requireRole(['admin', 'member', 'owner']), getSingleClientController)
router.delete('/:clientId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), auditLogMiddleware({
    action: 'client.delete',
    entityType: 'client',
    entityIdParam: 'clientId'
}), deleteClientController)

export default router

import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createClientController, deleteClientController, getAllClientsController, getSingleClientController, updateClientController } from '../controller/clients.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()
router.get('/', readRateLimiter, requireRole(['admin', 'member', 'owner']), getAllClientsController)
router.post('/', writeRateLimiter, requireRole(['admin', 'member', 'owner']), createClientController)

router.put('/:clientId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), updateClientController)
router.get('/:clientId', readRateLimiter, requireRole(['admin', 'member', 'owner']), getSingleClientController)
router.delete('/:clientId', writeRateLimiter, requireRole(['admin', 'member', 'owner']), deleteClientController)

export default router

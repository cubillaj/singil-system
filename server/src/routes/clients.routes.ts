import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createClientController, deleteClientController, getAllClientsController, getSingleClientController, updateClientController } from '../controller/clients.controller.js'

const router = express.Router()
router.get('/', requireRole(['admin', 'member', 'owner']), getAllClientsController)
router.post('/', requireRole(['admin', 'member', 'owner']), createClientController)

router.put('/:clientId', requireRole(['admin', 'member', 'owner']), updateClientController)
router.get('/:clientId', requireRole(['admin', 'member', 'owner']), getSingleClientController)
router.delete('/:clientId', requireRole(['admin', 'member', 'owner']), deleteClientController)

export default router

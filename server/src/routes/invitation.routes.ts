import express from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { createInvitationController } from '../controller/invitations.controller.js'

const router = express.Router()

router.post('/', requireRole(['owner', 'admin']), createInvitationController)

export default router
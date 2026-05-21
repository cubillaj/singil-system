import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createInvitationController } from '../controller/invitations.controller.js'

const router = express.Router()

// Admin and owner users can invite new members into their own organization.
router.post('/', requireRole(['owner', 'admin']), createInvitationController)

export default router

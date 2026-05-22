import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createInvitationController } from '../controller/invitations.controller.js'

const router = express.Router()

// Admin and owner users can invite new members into their own organization but system_admin can sen invitation to any organization.
router.post('/', requireRole(['system_admin','owner', 'admin']), createInvitationController)

export default router

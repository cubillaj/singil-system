import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createInvitationController, deleteOrganizationInvitesController, getInvitationController } from '../controller/invitations.controller.js'

const router = express.Router()
router.get('/', requireRole(['owner', 'admin']), getInvitationController)
// Admin and owner users can invite new members into their own organization but system_admin can sen invitation to any organization.
router.post('/', requireRole(['system_admin','owner', 'admin']), createInvitationController)
router.delete('/:id', requireRole(['system_admin','owner', 'admin']), deleteOrganizationInvitesController)

export default router

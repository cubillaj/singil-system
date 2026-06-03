import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createInvitationController, deleteOrganizationInvitesController, getInvitationController } from '../controller/invitations.controller.js'
import { readRateLimiter, sensitiveActionRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()
router.get('/', readRateLimiter, requireRole(['system_admin', 'owner', 'admin']), getInvitationController)
// Admin and owner users can invite new members into their own organization but system_admin can sen invitation to any organization.
router.post('/', sensitiveActionRateLimiter, requireRole(['system_admin','owner', 'admin']), auditLogMiddleware({
    action: 'invitation.create',
    entityType: 'invitation',
    getMetadata: (req) => ({ role: req.body?.role, email: req.body?.email })
}), createInvitationController)
router.delete('/', writeRateLimiter, requireRole(['system_admin','owner', 'admin']), auditLogMiddleware({
    action: 'invitation.delete',
    entityType: 'invitation'
}), deleteOrganizationInvitesController)
router.delete('/:id', writeRateLimiter, requireRole(['system_admin','owner', 'admin']), auditLogMiddleware({
    action: 'invitation.delete',
    entityType: 'invitation',
    entityIdParam: 'id'
}), deleteOrganizationInvitesController)

export default router

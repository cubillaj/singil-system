import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { changeUserOrganizationPasswordController, deleteUserOrganizationController, getOrganizationMembersAndAdminController, getSingleOrganizationUserController, updateOrganizationController, updateUserOrganizationController } from '../controller/organization.controller.js'
import { upload } from '../middleware/upload.middleware.js'
import { readRateLimiter, sensitiveActionRateLimiter, uploadRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()

router.get('/', readRateLimiter, requireRole(['owner', 'admin']), getOrganizationMembersAndAdminController)
// Organization profile updates are limited to admin and owner users.
router.put(
    '/org-profile',
    uploadRateLimiter,
    requireRole(['admin', 'owner']),
    auditLogMiddleware({
        action: 'organization.update',
        entityType: 'organization',
        getMetadata: (req) => ({ name: req.body?.name, slug: req.body?.slug, hasLogo: Boolean(req.file) })
    }),
    upload.single('logo'),
    updateOrganizationController)

router.get('/:id', readRateLimiter, requireRole(['admin', 'owner']), getSingleOrganizationUserController)
router.put('/:id/password', sensitiveActionRateLimiter, requireRole(['admin', 'owner']), auditLogMiddleware({
    action: 'organization_user.password_update',
    entityType: 'user',
    entityIdParam: 'id'
}), changeUserOrganizationPasswordController)
router.put('/:id', writeRateLimiter, requireRole(['admin', 'owner']), auditLogMiddleware({
    action: 'organization_user.update',
    entityType: 'user',
    entityIdParam: 'id',
    getMetadata: (req) => ({ role: req.body?.role, status: req.body?.status })
}), updateUserOrganizationController)
router.delete('/:id', sensitiveActionRateLimiter, requireRole(['admin', 'owner']), auditLogMiddleware({
    action: 'organization_user.delete',
    entityType: 'user',
    entityIdParam: 'id'
}), deleteUserOrganizationController)

export default router

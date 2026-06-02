import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { changeUserOrganizationPasswordController, deleteUserOrganizationController, getOrganizationMembersAndAdminController, getSingleOrganizationUserController, updateOrganizationController, updateUserOrganizationController } from '../controller/organization.controller.js'
import { upload } from '../middleware/upload.middleware.js'
import { readRateLimiter, sensitiveActionRateLimiter, uploadRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()

router.get('/', readRateLimiter, requireRole(['owner', 'admin']), getOrganizationMembersAndAdminController)
// Organization profile updates are limited to admin and owner users.
router.put(
    '/org-profile',
    uploadRateLimiter,
    requireRole(['admin', 'owner']),
    upload.single('logo'),
    updateOrganizationController)

router.get('/:id', readRateLimiter, requireRole(['admin', 'owner']), getSingleOrganizationUserController)
router.put('/:id/password', sensitiveActionRateLimiter, requireRole(['admin', 'owner']), changeUserOrganizationPasswordController)
router.put('/:id', writeRateLimiter, requireRole(['admin', 'owner']), updateUserOrganizationController)
router.delete('/:id', sensitiveActionRateLimiter, requireRole(['admin', 'owner']), deleteUserOrganizationController)

export default router

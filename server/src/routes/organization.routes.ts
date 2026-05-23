import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { deleteUserOrganizationController, getOrganizationMembersAndAdminController, getSingleOrganizationUserController, updateOrganizationController, updateUserOrganizationController } from '../controller/organization.controller.js'
import { upload } from '../middleware/upload.middleware.js'

const router = express.Router()

router.get('/', requireRole(['owner', 'admin']), getOrganizationMembersAndAdminController)
// Organization profile updates are limited to admin and owner users.
router.put(
    '/org-profile',
    requireRole(['admin', 'owner']),
    upload.single('logo'),
    updateOrganizationController)

router.get('/:id', requireRole(['admin', 'owner']), getSingleOrganizationUserController)
router.put('/:id', requireRole(['admin', 'owner']), updateUserOrganizationController)
router.delete('/:id', requireRole(['admin', 'owner']), deleteUserOrganizationController)

export default router

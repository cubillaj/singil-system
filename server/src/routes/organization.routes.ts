import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { updateOrganizationController } from '../controller/organization.controller.js'
import { upload } from '../middleware/upload.middleware.js'

const router = express.Router()

// Organization profile updates are limited to admin and owner users.
router.put(
    '/org-profile',
    requireRole(['admin', 'owner']),
    upload.single('logo'),
    updateOrganizationController)

export default router

import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { adminDashboardController, memberDashboardController, ownerDashboardController } from '../controller/dashboard.controller.js'

const router = express.Router()

router.get('/owner', requireRole(['owner']), ownerDashboardController)
router.get('/admin', requireRole(['admin']), adminDashboardController)
router.get('/member', requireRole(['member']), memberDashboardController)

export default router
import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { adminDashboardController, memberDashboardController, ownerDashboardController } from '../controller/dashboard.controller.js'
import { readRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()

router.get('/owner', readRateLimiter, requireRole(['owner']), ownerDashboardController)
router.get('/admin', readRateLimiter, requireRole(['admin']), adminDashboardController)
router.get('/member', readRateLimiter, requireRole(['member']), memberDashboardController)

export default router

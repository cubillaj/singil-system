import express from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { changePasswordController, getAllUsersController, updateUserInfoController, userInfoController } from '../controller/users.controller.js'
import { upload } from '../middleware/upload.middleware.js'
import { readRateLimiter, sensitiveActionRateLimiter, uploadRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()

router.get('/', requireRole(['system_admin']), getAllUsersController)
router.put('/', uploadRateLimiter, requireAuth, auditLogMiddleware({
    action: 'user.update_profile',
    entityType: 'user',
    getMetadata: (req) => ({ hasAvatar: Boolean(req.file), name: req.body?.name, lastName: req.body?.lastName })
}), upload.single('avatarUrl'), updateUserInfoController)
router.get('/user-info', readRateLimiter, requireAuth, userInfoController)
router.put('/password', sensitiveActionRateLimiter, requireAuth, auditLogMiddleware({
    action: 'user.change_password',
    entityType: 'user'
}), changePasswordController)

export default router

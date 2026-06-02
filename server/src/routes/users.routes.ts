import express from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { changePasswordController, updateUserInfoController, userInfoController } from '../controller/users.controller.js'
import { upload } from '../middleware/upload.middleware.js'
import { readRateLimiter, sensitiveActionRateLimiter, uploadRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()

router.put('/', uploadRateLimiter, requireAuth, upload.single('avatarUrl'), updateUserInfoController)
router.get('/user-info', readRateLimiter, requireAuth, userInfoController)
router.put('/password', sensitiveActionRateLimiter, requireAuth, changePasswordController)

export default router

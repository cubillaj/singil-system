import express from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { changePasswordController, updateUserInfoController, userInfoController } from '../controller/users.controller.js'
import { upload } from '../middleware/upload.middleware.js'

const router = express.Router()

router.put('/', requireAuth, upload.single('avatarUrl'), updateUserInfoController)
router.get('/user-info', requireAuth, userInfoController)
router.put('/password', requireAuth, changePasswordController)

export default router

import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createProductController, deleteProductsController, getProductsController, getSingleProductController, updateProductsController } from '../controller/products.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'

const router = express.Router()

router.get('/', readRateLimiter, requireRole(['admin', 'member', 'owner']), getProductsController)
router.post('/', writeRateLimiter, requireRole(['admin', 'owner']), createProductController)
router.put('/:productId', writeRateLimiter, requireRole(['admin', 'owner']), updateProductsController)
router.get('/:productId', readRateLimiter, requireRole(['admin', 'owner', 'member']), getSingleProductController)
router.delete('/:productId', writeRateLimiter, requireRole(['admin', 'owner', 'member']), deleteProductsController)


export default router

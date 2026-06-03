import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createProductController, deleteProductsController, getProductsController, getSingleProductController, updateProductsController } from '../controller/products.controller.js'
import { readRateLimiter, writeRateLimiter } from '../middleware/rateLiter.middleware.js'
import { auditLogMiddleware } from '../middleware/audit-log.middleware.js'

const router = express.Router()

router.get('/', readRateLimiter, requireRole(['admin', 'member', 'owner']), getProductsController)
router.post('/', writeRateLimiter, requireRole(['admin', 'owner']), auditLogMiddleware({
    action: 'product.create',
    entityType: 'product',
    getMetadata: (req) => ({ name: req.body?.name, unitPrice: req.body?.unitPrice })
}), createProductController)
router.put('/:productId', writeRateLimiter, requireRole(['admin', 'owner']), auditLogMiddleware({
    action: 'product.update',
    entityType: 'product',
    entityIdParam: 'productId'
}), updateProductsController)
router.get('/:productId', readRateLimiter, requireRole(['admin', 'owner', 'member']), getSingleProductController)
router.delete('/:productId', writeRateLimiter, requireRole(['admin', 'owner', 'member']), auditLogMiddleware({
    action: 'product.delete',
    entityType: 'product',
    entityIdParam: 'productId'
}), deleteProductsController)


export default router

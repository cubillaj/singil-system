import express from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { createProductController, deleteProductsController, getProductsController, getSingleProductController, updateProductsController } from '../controller/products.controller.js'

const router = express.Router()

router.get('/', requireRole(['admin', 'member', 'owner']), getProductsController)
router.post('/', requireRole(['admin', 'owner']), createProductController)
router.put('/:productId', requireRole(['admin', 'owner']), updateProductsController)
router.get('/:productId', requireRole(['admin', 'owner', 'member']), getSingleProductController)
router.delete('/:productId', requireRole(['admin', 'owner', 'member']), deleteProductsController)


export default router
import * as ProductServices from '../services/products.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'
export const createProductController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const product = await ProductServices.createProduct(session.organizationId, req.body)

        return res.status(201).json({
            message: 'Successfully created a product.',
            product
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getProductsController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.organizationId === null || typeof session.organizationId !== 'number') {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }
        const products = await ProductServices.getProducts(session.organizationId, req.query)

        return res.status(200).json({
            ...products
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getSingleProductController = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId)

        if(productId < 0) {
            return res.status(400).json({
                message: 'Product id is required'
            })
        }

        const session = req.authSession!

        if(session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const product = await ProductServices.getSingleProduct({
            productId,
            organizationId: session.organizationId
        })

        return res.status(200).json({
            product
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const updateProductsController = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId)

        const session = req.authSession!

        if(session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        await ProductServices.updateProduct(
            productId,
            session.organizationId,
            req.body
        )

        return res.status(200).json({
            message: 'Successfully updated a product.'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const deleteProductsController = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId)

        const session = req.authSession!

        if(session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        await ProductServices.deleteProduct({
            productId,
            organizationId: session.organizationId
        })

        return res.status(200).json({
            message: 'Successfully delete a product.'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

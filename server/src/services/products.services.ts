import { and, eq, sql } from "drizzle-orm"
import { db } from "../db/db.js"
import { organizations, products } from "../db/schema.js"
import { AppError } from "../utils/appError.js"
import { CreateProductSchema, DeleteProductSchema, GetSingleProductSchema, UpdateProductSchema } from "../validation/products.validation.js"
import { getFirstZodMessage } from "../utils/zodErrors.js"
import { id } from "zod/locales"
import { productFilter } from "../utils/product.utils.js"



export const createProduct = async (organizationId: number ,data: unknown) => {
    const parsed = CreateProductSchema.safeParse(data)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid Data'

        throw new AppError(msg, 400)
    }

    const { name, description, unit, unitPrice, taxRate } = parsed.data

    if (typeof organizationId !== 'number') {
        throw new AppError('Invalid data', 400)
    }

    const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
        columns: {
            id: true,
            plan: true
        }
    })

    if (!organization) throw new AppError('Organization is not found', 404)

    if(organization.plan === 'free') {
        const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                    .from(products)
                                    .where(eq(products.organizationId, organization.id))

        if(Number(count) >= 7) {
            throw new AppError('You can only create 7 products for your organization in free plan.', 400)
        }
    }

    const [product] = await db.insert(products)
                            .values({
                                organizationId: organization.id,
                                name,
                                description,
                                taxRate,
                                unitPrice,
                                unit
                            })
                            .returning({
                                name: products.name,
                                description: products.description,
                                unit: products.unit,
                                unitPrice: products.unitPrice
                            })

    if(!product) throw new AppError('Failed to create product.', 400)

    return product
}

export const getProducts = async (organizationId: number, query: unknown) => {
    const {
        filters,
        page,
        limit,
        offSet,
        total,
        totalPages,
        orderBy
    } = await productFilter(organizationId, query)

    const allProducts = await db.query.products.findMany({
        where: and(...filters),
        columns: {
            createdAt: false,
            updatedAt: false
        },
        orderBy,
        limit,
        offset: offSet
      }
    )

    return {
        products: allProducts,
        pagination: {
            page,
            total,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            haxPrevPage: page > 1
        }
    }
}


export const getSingleProduct = async (ids: unknown) => {
    const parsed = GetSingleProductSchema.safeParse(ids)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { productId, organizationId} = parsed.data

    const product = await db.query.products.findFirst({
        where: and(
            eq(products.id, productId),
            eq(products.organizationId, organizationId)
        ),
        columns: {
            createdAt: false,
            updatedAt: false
        }
    })

    if (!product) {
        throw new AppError('Product not found', 404)
    }

    return product
}

export const updateProduct = async (productId: number, organizationId: number, data: unknown) => {
    const parsed = UpdateProductSchema.safeParse(data)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid Data'

        throw new AppError(msg, 400)
    }

    if(!productId) {
        throw new AppError('Product id is required', 400)
    }

    if(!organizationId) {
        throw new AppError('Organization id is required', 400)
    }

    const updatedData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    )

    if(Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update', 400)
    }

    const existingProduct = await db.query.products.findFirst({
        where: and(
            eq(products.id, productId),
            eq(products.organizationId, organizationId)
        ),
        columns: {
            id: true
        }
    })

    if(!existingProduct) {
        throw new AppError('Product is not found', 404)
    }

    const [product] = await db.update(products)
                                .set({
                                    ...updatedData
                                })
                                .where(and(
                                    eq(products.id, existingProduct.id),
                                    eq(products.organizationId, organizationId)
                                ))
                                .returning({
                                    id: products.id
                                })
    
    if (!product) {
        throw new AppError('Failed to update product', 400)
    }

    return product
}

export const deleteProduct = async (ids: unknown) => {
    const parsed = DeleteProductSchema.safeParse(ids)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { productId, organizationId} = parsed.data

    if(typeof organizationId !== 'number') {
        throw new AppError('Organization id is required', 400)
    }

    const [product] = await db.select({
        id: products.id
    })
    .from(products)
    .where(and(
        eq(products.id, productId),
        eq(products.organizationId, organizationId)
    ))

    if (!product) {
        throw new AppError('Product is not found', 404)
    }

    const [deletedProduct] = await db.delete(products)
                                    .where(and(
                                        eq(products.id, product.id),
                                        eq(products.organizationId, organizationId)
                                    ))
                                    .returning({
                                        id: products.id
                                    })
    
    if (!deletedProduct) {
        throw new AppError('Failed to delete a product.', 400)
    }

    return deletedProduct
}
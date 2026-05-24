import z from "zod";

export const CreateProductSchema = z.object({
    name: z.string({ error: "Product name is required"})
        .min(1, 'Product name is required')
        .max(255, 'Product name must be 255 characters or fewer'),
    description: z.string().optional(),
    unitPrice: z.coerce.number({error: 'Unit price must be greater than 0'})
        .positive('Unit price must be greater than 0')
        .transform((value) => value.toFixed(2)),
    unit: z.string()
        .min(1)
        .max(50)
        .default('item'),
    taxRate: z.coerce.number()
        .min(0, 'Tax rate cannot be negative')
        .max(100, 'Tax rate cannot be over 100')
        .default(0)
        .transform((value) => value.toFixed(2))
})

export const GetSingleProductSchema = z.object({
    productId: z.coerce.number().int().positive(),
    organizationId: z.coerce.number().int().positive()
})

export const ProductQuerySchema = z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(10).default(10),
    sortBy: z.
        enum(['createdAt'])
        .default('createdAt'),
    sortOrder: z.
        enum(['asc', 'desc'])
        .default('desc'),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional()
})

export const UpdateProductSchema = CreateProductSchema
                                        .extend({
                                            unit: z.string()
                                                .nullable()
                                                .optional()
                                        })
                                        .partial()

export const DeleteProductSchema = z.object({
    productId: z.coerce.number().int().positive(),
    organizationId: z.coerce.number().int().positive()
})

export type CreateProduct = z.infer<typeof CreateProductSchema>
export type GetSingleProduct = z.infer<typeof GetSingleProductSchema>
export type UpdateProduct = z.infer<typeof UpdateProductSchema>
export type DeleteProduct = z.infer<typeof DeleteProductSchema>
export type ProductSchema = z.infer<typeof ProductQuerySchema>
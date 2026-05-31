import z from "zod";

const moneySchema = z.coerce
  .number()
  .positive("Payment amount must be greater than 0.")
  .transform((value) => value.toFixed(2));

export const CreatePaymentSchema = z.object({
    invoiceId: z.coerce
            .number({ error: 'Invoice id is required.'})
            .int()
            .positive({ error: 'Invoice id must be positive.'}),
    organizationId: z.coerce
            .number({ error: 'Organization id is required.'})
            .int()
            .positive({ error: 'Organization id must be positive.'}),
    amount: moneySchema,
    method: z.enum(["bank_transfer", "gcash", "maya", "other"], {
      error: "Invalid payment method.",
    }),
    reference: z.string().max(255).optional(),
    note: z.string().max(1000).optional(),
    paidAt: z.coerce.date().default(() => new Date())
})  

export const PaymentsSchema = z.object({
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

export const UpdatePaymentSchema = CreatePaymentSchema
  .omit({
    organizationId: true,
    invoiceId: true
  })
  .partial()

export const GetPaymentSchema = z.object({
  paymentId: z.coerce.number({ error: 'Payment id is required'}).int().positive({ error: 'Payment id must be positive.'}),
  organizationId: z.coerce.number({ error: 'Organization id is required'}).int().positive({ error: 'Organization id must be positive.'}),
})

export const DeletePaymentSchema = GetPaymentSchema

export type CreatePayment = z.infer<typeof CreatePaymentSchema>
export type GetPayment = z.infer<typeof GetPaymentSchema>
export type DeletePayment = z.infer<typeof DeletePaymentSchema>
import z from "zod";
import { currencyEnum } from "./clients.validation.js";

export const invoiceStatusEnum = [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
] as const;

const moneySchema = z.coerce
  .number()
  .min(0, "Amount cannot be negative.")
  .transform((value) => value.toFixed(2));

const percentageSchema = z.coerce
  .number()
  .min(0, "Percentage cannot be negative.")
  .max(100, "Percentage cannot be over 100.")
  .default(0)
  .transform((value) => value.toFixed(2));

export const invoiceItemSchema = z.object({
  productId: z.coerce.number().int().positive().optional().nullable(),
  description: z.string({ error: "Description is required." }).min(1).max(500),
  quantity: z.coerce
    .number({ error: "Quantity is required." })
    .positive("Quantity must be greater than 0.")
    .transform((value) => value.toFixed(2)),
  unitPrice: z.coerce
    .number({ error: "Unit price is required." })
    .min(0, "Unit price cannot be negative.")
    .transform((value) => value.toFixed(2)),
  taxRate: percentageSchema,
  discount: percentageSchema,
});

const invoiceBaseSchema = z.object({
  clientId: z.coerce.number().int().positive("Client id is required."),
  invoiceNumber: z
    .string()
    .min(1, "Invoice number is required.")
    .max(50, "Invoice number must be 50 characters or fewer.")
    .optional(),
  amountPaid: moneySchema.optional(),
  status: z.enum(invoiceStatusEnum, { error: "Invalid status." }).default("draft"),
  currency: z.enum(currencyEnum, { error: "Invalid currency." }).default("PH"),
  issueDate: z.coerce.date({ error: "Issue date is required." }),
  dueDate: z.coerce.date({ error: "Due date is required." }),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  footer: z.string().max(1000).optional(),
  pdfUrl: z.string().url("PDF URL must be a valid URL.").optional(),
  items: z
    .array(invoiceItemSchema)
    .min(1, "At least one invoice item is required."),
});

export const CreateInvoiceSchema = invoiceBaseSchema
  .superRefine((data, ctx) => {
    if (data.dueDate < data.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date must be on or after the issue date.",
      });
    }
  });

export const UpdateInvoiceSchema = invoiceBaseSchema.omit({
  clientId: true,
  items: true,
})
  .extend({
    clientId: z.coerce.number().int().positive().optional(),
    status: z.enum(invoiceStatusEnum, { error: "Invalid status." }).optional(),
    currency: z.enum(currencyEnum, { error: "Invalid currency." }).optional(),
    items: z.array(invoiceItemSchema).min(1).optional(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (data.issueDate && data.dueDate && data.dueDate < data.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date must be on or after the issue date.",
      });
    }
  });

export const GetSingleInvoiceSchema = z.object({
  invoiceId: z.coerce.number({ error: 'Invalid id'}).int().positive(),
  organizationId: z.coerce.number({ error: 'Invalid id'}).int().positive(),
});

export const DeleteInvoiceSchema = GetSingleInvoiceSchema;

export const InvoiceQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(invoiceStatusEnum).optional(),
  currency: z.enum(currencyEnum).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10).default(10),
  sortBy: z.enum(["createdAt", "issueDate", "dueDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  issueFrom: z.coerce.date().optional(),
  issueTo: z.coerce.date().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
});

export const RecordPaymentSchema = z.object({
  amount: moneySchema.refine((value) => Number(value) > 0, {
    message: "Payment amount must be greater than 0.",
  }),
  currency: z.enum(currencyEnum, { error: "Invalid currency." }).default("PH"),
  method: z.enum(["bank_transfer", "gcash", "maya", "other"], {
    error: "Invalid payment method.",
  }),
  reference: z.string().max(255).optional(),
  note: z.string().max(1000).optional(),
  paidAt: z.coerce.date().default(() => new Date()),
});

export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof UpdateInvoiceSchema>;
export type GetSingleInvoice = z.infer<typeof GetSingleInvoiceSchema>;
export type DeleteInvoice = z.infer<typeof DeleteInvoiceSchema>;
export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;
export type RecordPayment = z.infer<typeof RecordPaymentSchema>;

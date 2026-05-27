import z from "zod";
import { currencyEnum } from "./clients.validation.js";

export const recurringIntervalEnum = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
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

export const recurringInvoiceItemSchema = z.object({
  productId: z.coerce.number().int().positive().optional().nullable(),
  description: z.string({ error: "Description is required." })
    .min(1, "Description is required.")
    .max(500, "Description must be 500 characters or fewer."),
  quantity: z.coerce
    .number({ error: "Quantity is required." })
    .positive("Quantity must be greater than 0.")
    .transform((value) => value.toFixed(2)),
  unitPrice: moneySchema,
  taxRate: percentageSchema,
  discount: percentageSchema,
});

const recurringInvoiceBaseSchema = z.object({
  clientId: z.coerce.number().int().positive("Client id is required."),
  createdById: z.coerce.number().int().positive("Created by id is required."),
  organizationId: z.coerce.number().int().positive("Organization id is required."),
  interval: z.enum(recurringIntervalEnum, { error: "Invalid recurring interval." }),
  nextIssueDate: z.coerce.date({ error: "Next issue date is required." }),
  endDate: z.coerce.date().optional().nullable(),
  autoSend: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  currency: z.enum(currencyEnum, { error: "Invalid currency." }).default("PH"),
  notes: z.string().max(2000, "Notes must be 2000 characters or fewer.").optional(),
  footer: z.string().max(1000, "Footer must be 1000 characters or fewer.").optional(),
  dueDaysAfterIssue: z.coerce
    .number({ error: "Due days after issue is required." })
    .int("Due days after issue must be a whole number.")
    .min(0, "Due days after issue cannot be negative.")
    .max(365, "Due days after issue must be 365 days or fewer.")
    .default(30),
  items: z.array(recurringInvoiceItemSchema)
    .min(1, "At least one recurring invoice item is required."),
});

export const CreateRecurringInvoiceSchema = recurringInvoiceBaseSchema
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.nextIssueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the next issue date.",
      });
    }
  });

export const UpdateRecurringInvoiceSchema = recurringInvoiceBaseSchema
  .omit({
    createdById: true,
    organizationId: true,
    items: true,
  })
  .extend({
    items: z.array(recurringInvoiceItemSchema)
      .min(1, "At least one recurring invoice item is required.")
      .optional(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (data.endDate && data.nextIssueDate && data.endDate < data.nextIssueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the next issue date.",
      });
    }
  });

export const GetSingleRecurringInvoiceSchema = z.object({
  recurringInvoiceId: z.coerce.number({ error: "Invalid recurring invoice id." }).int().positive(),
  organizationId: z.coerce.number({ error: "Invalid organization id." }).int().positive(),
});

export const DeleteRecurringInvoiceSchema = GetSingleRecurringInvoiceSchema;

export const GenerateRecurringInvoiceSchema = GetSingleRecurringInvoiceSchema.extend({
  createdById: z.coerce.number({ error: "Created by user id is required." }).int().positive(),
});

export const RecurringInvoiceQuerySchema = z.object({
  search: z.string().optional(),
  interval: z.enum(recurringIntervalEnum).optional(),
  isActive: z.coerce.boolean().optional(),
  autoSend: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10).default(10),
  sortBy: z.enum(["createdAt", "nextIssueDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  nextIssueFrom: z.coerce.date().optional(),
  nextIssueTo: z.coerce.date().optional(),
});

export type CreateRecurringInvoice = z.infer<typeof CreateRecurringInvoiceSchema>;
export type UpdateRecurringInvoice = z.infer<typeof UpdateRecurringInvoiceSchema>;
export type GetSingleRecurringInvoice = z.infer<typeof GetSingleRecurringInvoiceSchema>;
export type DeleteRecurringInvoice = z.infer<typeof DeleteRecurringInvoiceSchema>;
export type GenerateRecurringInvoice = z.infer<typeof GenerateRecurringInvoiceSchema>;
export type RecurringInvoiceQuery = z.infer<typeof RecurringInvoiceQuerySchema>;
export type RecurringInvoiceItem = z.infer<typeof recurringInvoiceItemSchema>;

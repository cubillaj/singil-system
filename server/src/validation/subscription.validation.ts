import z from "zod";
import { currencyEnum } from "./clients.validation.js";

export const subscriptionPlanEnum = ["free", "pro", "business"] as const;
export const subscriptionStatusEnum = ["active", "past_due", "cancelled", "expired"] as const;
export const subscriptionProviderEnum = ["manual", "paymongo", "stripe"] as const;

const positiveIdSchema = (message: string) => z.coerce
  .number({ error: message })
  .int(message)
  .positive(message);

const moneySchema = z.coerce
  .number({ error: "Amount is required." })
  .positive("Amount must be positive.")
  .transform((value) => value.toFixed(2));

export const OrganizationSubscriptionSchema = z.object({
  organizationId: positiveIdSchema("Organization id is required."),
  plan: z.enum(subscriptionPlanEnum, { error: "Invalid subscription plan." }).default("free"),
  status: z.enum(subscriptionStatusEnum, { error: "Invalid subscription status." }).default("active"),
  startsAt: z.coerce.date().optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional().nullable(),
  cancelledAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  provider: z.enum(subscriptionProviderEnum, { error: "Invalid subscription provider." }).default("manual"),
  providerCustomerId: z.string().max(255).optional().nullable(),
  providerSubscriptionId: z.string().max(255).optional().nullable(),
});

export const UpdateOrganizationSubscriptionSchema = OrganizationSubscriptionSchema
  .omit({ organizationId: true })
  .partial()
  .superRefine((data, ctx) => {
    if (data.currentPeriodEnd && data.currentPeriodStart && data.currentPeriodEnd < data.currentPeriodStart) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPeriodEnd"],
        message: "Current period end must be after current period start.",
      });
    }
  });

export const SubscriptionPaymentSchema = z.object({
  userId: z.coerce.number().int().positive(),
  organizationId: positiveIdSchema("Organization id is required."),
  currency: z.enum(currencyEnum, { error: "Invalid currency." }).default("PH"),
  plan: z.enum(["pro", "business"], { error: "Invalid subscription plan." }),
});

export const CreateSubscriptionPaymentRecordSchema = z.object({
  organizationId: positiveIdSchema("Organization id is required."),
  subscriptionId: positiveIdSchema("Subscription id must be positive.").optional().nullable(),
  amount: moneySchema,
  currency: z.enum(currencyEnum, { error: "Invalid currency." }).default("PH"),
  provider: z.enum(subscriptionProviderEnum, { error: "Invalid payment provider." }),
  checkoutSessionId: z.string().max(255).optional().nullable(),
  providerPaymentId: z.string().max(255).optional().nullable(),
  status: z.string({ error: "Payment status is required." })
    .min(1, "Payment status is required.")
    .max(50, "Payment status must be 50 characters or fewer."),
  paidAt: z.coerce.date().optional().nullable(),
});

export type OrganizationSubscription = z.infer<typeof OrganizationSubscriptionSchema>;
export type UpdateOrganizationSubscription = z.infer<typeof UpdateOrganizationSubscriptionSchema>;
export type SubscriptionPayment = z.infer<typeof SubscriptionPaymentSchema>;
export type CreateSubscriptionPaymentRecord = z.infer<typeof CreateSubscriptionPaymentRecordSchema>;

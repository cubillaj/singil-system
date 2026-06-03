import z from "zod";

export const AuditLogActionSchema = z.string()
  .min(1, "Audit action is required")
  .max(100, "Audit action must be 100 characters or fewer");

export const AuditLogEntityTypeSchema = z.string()
  .min(1, "Audit entity type is required")
  .max(100, "Audit entity type must be 100 characters or fewer");

export const CreateAuditLogSchema = z.object({
  organizationId: z.number().int().positive(),
  userId: z.number().int().positive().nullable().optional(),
  action: AuditLogActionSchema,
  entityType: AuditLogEntityTypeSchema,
  entityId: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.coerce.string().trim().max(100, "Search must be 100 characters or fewer").optional(),
  entityType: AuditLogEntityTypeSchema.optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});

export type CreateAuditLogInput = z.infer<typeof CreateAuditLogSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

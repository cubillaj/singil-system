import { and, desc, eq, gte, ilike, lte, sql, SQL } from "drizzle-orm";
import { db } from "../db/db.js";
import { auditLog } from "../db/schema.js";
import { AppError } from "../utils/appError.js";
import { AuditLogQuerySchema, CreateAuditLogSchema, type CreateAuditLogInput } from "../validation/audit-log.validation.js";
import { getFirstZodMessage } from "../utils/zodErrors.js";
import { getOrganizationEntitlements } from "./subscription.services.js";

export const createAuditLog = async (data: CreateAuditLogInput) => {
  const parsed = CreateAuditLogSchema.safeParse(data);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const [createdAuditLog] = await db.insert(auditLog)
    .values(parsed.data)
    .returning();

  if (!createdAuditLog) {
    throw new AppError("Failed to create audit log.", 500);
  }

  return createdAuditLog;
};

export const getAuditLogs = async (organizationId: number, query: unknown) => {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements.auditLogs) {
    throw new AppError("Audit logs require the Business plan.", 403);
  }

  const parsed = AuditLogQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const {
    search,
    createdFrom,
    createdTo,
    entityType,
    limit,
    page,
  } = parsed.data;

  const filters: SQL[] = [
    eq(auditLog.organizationId, organizationId),
  ];

  if(search) {
    filters.push(ilike(auditLog.action, `%${search}%`))
  }
  
  if (entityType) filters.push(eq(auditLog.entityType, entityType));
  if (createdFrom) filters.push(gte(auditLog.createdAt, createdFrom));
  if (createdTo) filters.push(lte(auditLog.createdAt, createdTo));

  const where = and(...filters);
  const offset = (page - 1) * limit;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(where);

  const logs = await db.query.auditLog.findMany({
    where,
    orderBy: desc(auditLog.createdAt),
    limit,
    offset,
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const total = Number(count);
  const totalPages = Math.ceil(total / limit);

  return {
    auditLogs: logs,
    pagination: {
      total,
      totalPages,
      page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

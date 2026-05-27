import { and, asc, desc, eq, gte, ilike, lte, or, sql, SQL } from "drizzle-orm";
import { db } from "../db/db.js";
import { recurringInvoices } from "../db/schema.js";
import { AppError } from "./appError.js";
import { getFirstZodMessage } from "./zodErrors.js";
import { RecurringInvoiceQuerySchema } from "../validation/recurring-invoices.validation.js";

export const addRecurringInterval = (date: Date, interval: "weekly" | "monthly" | "quarterly" | "yearly") => {
  const nextDate = new Date(date);

  if (interval === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  if (interval === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  if (interval === "quarterly") {
    nextDate.setMonth(nextDate.getMonth() + 3);
  }

  if (interval === "yearly") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return nextDate;
};

export const recurringInvoiceFilter = async (organizationId: number, query: unknown) => {
  const parsed = RecurringInvoiceQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const {
    search,
    interval,
    isActive,
    autoSend,
    page,
    limit,
    sortBy,
    sortOrder,
    nextIssueFrom,
    nextIssueTo,
  } = parsed.data;

  const filters: SQL[] = [
    eq(recurringInvoices.organizationId, organizationId),
  ];

  if (search) {
    const searchFilter = or(
      ilike(recurringInvoices.notes, `%${search}%`),
      ilike(recurringInvoices.footer, `%${search}%`),
    );

    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (interval) {
    filters.push(eq(recurringInvoices.interval, interval));
  }

  if (isActive !== undefined) {
    filters.push(eq(recurringInvoices.isActive, isActive));
  }

  if (autoSend !== undefined) {
    filters.push(eq(recurringInvoices.autoSend, autoSend));
  }

  if (nextIssueFrom) {
    filters.push(gte(recurringInvoices.nextIssueDate, nextIssueFrom));
  }

  if (nextIssueTo) {
    filters.push(lte(recurringInvoices.nextIssueDate, nextIssueTo));
  }

  const sortColumn = {
    createdAt: recurringInvoices.createdAt,
    nextIssueDate: recurringInvoices.nextIssueDate,
  }[sortBy];

  const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offSet = (page - 1) * limit;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(recurringInvoices)
    .where(and(...filters));

  const total = Number(count);
  const totalPages = Math.ceil(total / limit);

  return {
    filters,
    offSet,
    total,
    totalPages,
    limit,
    orderBy,
    page,
  };
};

import { and, eq, lte } from "drizzle-orm";
import { db } from "../db/db.js";
import { clients, invoiceItems, invoices, recurringInvoiceItems, recurringInvoices } from "../db/schema.js";
import { AppError } from "../utils/appError.js";
import { calculateInvoiceItemsAndTotals } from "./invoices.services.js";
import { addRecurringInterval, recurringInvoiceFilter } from "../utils/recurring-invoice.utils.js";
import { getFirstZodMessage } from "../utils/zodErrors.js";
import {
  CreateRecurringInvoiceSchema,
  DeleteRecurringInvoiceSchema,
  GenerateRecurringInvoiceSchema,
  GetSingleRecurringInvoiceSchema,
  UpdateRecurringInvoiceSchema,
  type CreateRecurringInvoice,
} from "../validation/recurring-invoices.validation.js";

type AuthIds = {
  userId: number;
  organizationId: number;
};

type RecurringInputItem = CreateRecurringInvoice["items"][number];

const hasValue = (value: unknown) => value !== undefined;

const normalizeRecurringItems = (items: RecurringInputItem[]) => {
  return items.map((item, index) => ({
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate,
    discount: item.discount,
    sortOrder: index,
  }));
};

const assertClientBelongsToOrganization = async (clientId: number, organizationId: number) => {
  const [client] = await db.select({ id: clients.id })
    .from(clients)
    .where(and(
      eq(clients.id, clientId),
      eq(clients.organizationId, organizationId),
    ));

  if (!client) {
    throw new AppError("Client is not found", 404);
  }

  return client;
};

export const createRecurringInvoice = async (ids: AuthIds, data: unknown) => {
  const payload = typeof data === "object" && data !== null ? data : {};
  const parsed = CreateRecurringInvoiceSchema.safeParse({
    ...payload,
    createdById: ids.userId,
    organizationId: ids.organizationId,
  });

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const {
    clientId,
    organizationId,
    interval,
    nextIssueDate,
    endDate,
    autoSend,
    isActive,
    currency,
    notes,
    footer,
    dueDaysAfterIssue,
    items,
  } = parsed.data;

  await assertClientBelongsToOrganization(clientId, organizationId);

  const recurringInvoice = await db.transaction(async (tx) => {
    const [createdRecurringInvoice] = await tx.insert(recurringInvoices)
      .values({
        organizationId,
        clientId,
        createdById: ids.userId,
        interval,
        nextIssueDate,
        endDate,
        autoSend,
        isActive,
        currency,
        notes,
        footer,
        dueDaysAfterIssue,
      })
      .returning();

    if (!createdRecurringInvoice) {
      throw new AppError("Failed to create recurring invoice.", 400);
    }

    await tx.insert(recurringInvoiceItems).values(
      normalizeRecurringItems(items).map((item) => ({
        recurringInvoiceId: createdRecurringInvoice.id,
        ...item,
      })),
    );

    return createdRecurringInvoice;
  });

  return recurringInvoice;
};

export const getRecurringInvoices = async (organizationId: number, query: unknown) => {
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    throw new AppError("Organization id is required", 400);
  }

  const {
    filters,
    offSet,
    total,
    totalPages,
    limit,
    orderBy,
    page,
  } = await recurringInvoiceFilter(organizationId, query);

  const existingRecurringInvoices = await db.query.recurringInvoices.findMany({
    where: and(...filters),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          email: true,
          company: true,
        },
      },
      items: true,
    },
    offset: offSet,
    orderBy,
    limit,
  });

  return {
    recurringInvoices: existingRecurringInvoices,
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

export const getSingleRecurringInvoice = async (ids: unknown) => {
  const parsed = GetSingleRecurringInvoiceSchema.safeParse(ids);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const { recurringInvoiceId, organizationId } = parsed.data;

  const recurringInvoice = await db.query.recurringInvoices.findFirst({
    where: and(
      eq(recurringInvoices.id, recurringInvoiceId),
      eq(recurringInvoices.organizationId, organizationId),
    ),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          email: true,
          company: true,
        },
      },
      items: true,
    },
  });

  if (!recurringInvoice) {
    throw new AppError("Recurring invoice is not found.", 404);
  }

  return recurringInvoice;
};

export const updateRecurringInvoice = async (recurringInvoiceId: number, organizationId: number, data: unknown) => {
  const parsed = UpdateRecurringInvoiceSchema.safeParse(data);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const { items, clientId, ...recurringInvoiceData } = parsed.data;

  const updatedData = Object.fromEntries(
    Object.entries({
      ...recurringInvoiceData,
      clientId,
      updatedAt: new Date(),
    }).filter(([_, value]) => hasValue(value)),
  );

  if (items === undefined && Object.keys(updatedData).length === 1) {
    throw new AppError("No fields to update", 400);
  }

  const [existingRecurringInvoice] = await db.select({
    id: recurringInvoices.id,
  })
    .from(recurringInvoices)
    .where(and(
      eq(recurringInvoices.id, recurringInvoiceId),
      eq(recurringInvoices.organizationId, organizationId),
    ));

  if (!existingRecurringInvoice) {
    throw new AppError("Recurring invoice is not found.", 404);
  }

  if (clientId) {
    await assertClientBelongsToOrganization(clientId, organizationId);
  }

  const recurringInvoice = await db.transaction(async (tx) => {
    const [updatedRecurringInvoice] = await tx.update(recurringInvoices)
      .set(updatedData)
      .where(and(
        eq(recurringInvoices.id, recurringInvoiceId),
        eq(recurringInvoices.organizationId, organizationId),
      ))
      .returning();

    if (!updatedRecurringInvoice) {
      throw new AppError("Failed to update recurring invoice.", 400);
    }

    if (items) {
      await tx.delete(recurringInvoiceItems)
        .where(eq(recurringInvoiceItems.recurringInvoiceId, recurringInvoiceId));

      await tx.insert(recurringInvoiceItems).values(
        normalizeRecurringItems(items).map((item) => ({
          recurringInvoiceId,
          ...item,
        })),
      );
    }

    return updatedRecurringInvoice;
  });

  return recurringInvoice;
};

export const deleteRecurringInvoice = async (ids: unknown) => {
  const parsed = DeleteRecurringInvoiceSchema.safeParse(ids);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const { recurringInvoiceId, organizationId } = parsed.data;

  const [deletedRecurringInvoice] = await db.delete(recurringInvoices)
    .where(and(
      eq(recurringInvoices.id, recurringInvoiceId),
      eq(recurringInvoices.organizationId, organizationId),
    ))
    .returning({ id: recurringInvoices.id });

  if (!deletedRecurringInvoice) {
    throw new AppError("Recurring invoice is not found.", 404);
  }

  return deletedRecurringInvoice;
};

export const generateDueRecurringInvoices = async () => {
  const dueRecurringInvoices = await db.query.recurringInvoices.findMany({
    where: and(
      eq(recurringInvoices.isActive, true),
      eq(recurringInvoices.autoSend, true),
      lte(recurringInvoices.nextIssueDate, new Date())
    ),
    columns: {
      id: true,
      organizationId: true,
      createdById: true
    }
  })

  const results = []

  for ( const recurringInvoice of dueRecurringInvoices) {
    try {
      const invoice = await generateInvoiceFromRecurring({
        recurringInvoiceId: recurringInvoice.id,
        organizationId: recurringInvoice.organizationId,
        createdById: recurringInvoice.createdById
      })

      results.push(invoice)
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 409) {
        continue;
      }

      throw error;
    }
  }

  return results
}

export const generateInvoiceFromRecurring = async (ids: unknown) => {
  const parsed = GenerateRecurringInvoiceSchema.safeParse(ids);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const { recurringInvoiceId, organizationId, createdById } = parsed.data;

  const recurringInvoice = await db.query.recurringInvoices.findFirst({
    where: and(
      eq(recurringInvoices.id, recurringInvoiceId),
      eq(recurringInvoices.organizationId, organizationId),
    ),
    with: {
      items: true,
    },
  });

  if (!recurringInvoice) {
    throw new AppError("Recurring invoice is not found.", 404);
  }

  if (!recurringInvoice.isActive) {
    throw new AppError("Recurring invoice is inactive.", 400);
  }

  if (recurringInvoice.endDate && recurringInvoice.nextIssueDate > recurringInvoice.endDate) {
    throw new AppError("Recurring invoice has already ended.", 400);
  }

  if (!recurringInvoice.items.length) {
    throw new AppError("Recurring invoice has no items.", 400);
  }

  await assertClientBelongsToOrganization(recurringInvoice.clientId, organizationId);

  const issueDate = recurringInvoice.nextIssueDate;
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + recurringInvoice.dueDaysAfterIssue);

  const {
    calculatedItems,
    subtotal,
    taxAmount,
    discountAmount,
    total,
  } = calculateInvoiceItemsAndTotals(recurringInvoice.items.map((item) => ({
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate ?? "0.00",
    discount: item.discount ?? "0.00",
  })));

  const nextIssueDate = addRecurringInterval(issueDate, recurringInvoice.interval);
  const shouldStayActive = !recurringInvoice.endDate || nextIssueDate <= recurringInvoice.endDate;
  const invoiceNumber = `INV-R${recurringInvoice.id}-${Date.now()}`;

  const invoice = await db.transaction(async (tx) => {
    const [existingInvoice] = await tx.select({
      id: invoices.id,
    })
      .from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.recurringInvoiceId, recurringInvoice.id),
        eq(invoices.issueDate, issueDate),
      ));

    if (existingInvoice) {
      throw new AppError("Invoice was already generated for this recurring issue date.", 409);
    }

    const [createdInvoice] = await tx.insert(invoices)
      .values({
        organizationId,
        clientId: recurringInvoice.clientId,
        createdById,
        recurringInvoiceId: recurringInvoice.id,
        invoiceNumber,
        status: "draft",
        currency: recurringInvoice.currency,
        issueDate,
        dueDate,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        total: total.toFixed(2),
        amountPaid: "0.00",
        amountDue: total.toFixed(2),
        notes: recurringInvoice.notes,
        footer: recurringInvoice.footer,
      })
      .returning();

    if (!createdInvoice) {
      throw new AppError("Failed to generate invoice.", 400);
    }

    await tx.insert(invoiceItems).values(
      calculatedItems.map((item) => ({
        invoiceId: createdInvoice.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount,
        total: item.total,
        sortOrder: item.sortOrder,
      })),
    );

    await tx.update(recurringInvoices)
      .set({
        nextIssueDate,
        isActive: shouldStayActive,
        updatedAt: new Date(),
      })
      .where(eq(recurringInvoices.id, recurringInvoice.id));

    return createdInvoice;
  });

  return invoice;
};

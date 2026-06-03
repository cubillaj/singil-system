import { relations } from "drizzle-orm";
import { pgEnum, varchar, pgTable, serial, text, timestamp, uuid, boolean, integer, numeric, uniqueIndex, index, jsonb} from "drizzle-orm/pg-core";

export const planEnum = pgEnum('plan',['free', 'pro', 'business'])

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'cancelled'
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'bank_transfer',
  'gcash',
  'maya',
  'other'
])

export const currencyEnum = pgEnum('currency', [
  'PH',
  'USD',
  'EUR',
  'CAD',
  'AUD'
])

export const recurringIntervalEnum = pgEnum('recurring_interval', [
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
])

export const statusEnum = pgEnum('status', [
  'active',
  'inActive'
])

export const userRoleEnum = pgEnum('user_role', [
  'system_admin',
  'owner',
  'admin',
  'member'
])

export const inviteRoleEnum = pgEnum('invite_role', [
  'admin',
  'owner',
  'member'
])

export const subscriptionStatusEnum = pgEnum('subscription_status',[
  'active',
  'past_due',
  'cancelled',
  'expired'
])

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
} 

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade'}),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null'}),
  action: varchar('action', { length: 100}).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: integer('entity_id'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    auditLogOrganizationCreatedAtIdx: index("audit_log_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    auditLogUserCreatedAtIdx: index("audit_log_user_created_at_idx")
      .on(table.userId, table.createdAt),
    auditLogEntityIdx: index("audit_log_entity_idx")
      .on(table.entityType, table.entityId),
  };
})
// organization (multi-tenacy)

export const organizationSubscriptions = pgTable('organization_Subscriptions',{
  id: serial('id').primaryKey(),

  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade'} ),

  plan: planEnum("plan").default('free').notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),

  startsAt: timestamp("starts_at").defaultNow().notNull(),
  currentPeriodStart: timestamp("current_period_start").defaultNow().notNull(),
  currentPeriodEnd: timestamp("current_period_end"),

  cancelledAt: timestamp("cancelled_at"),
  expiresAt: timestamp("expires_at"),

  provider: varchar("provider", { length: 50 }), // paymongo, stripe, manual
  providerCustomerId: varchar("provider_customer_id", { length: 255 }),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }),
  ...timestamps
}, (table) => {
  return {
    organizationSubscriptionOrganizationUnique: uniqueIndex("organization_subscriptions_organization_id_unique")
      .on(table.organizationId),
  };
})


export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),

  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  subscriptionId: integer("subscription_id")
    .references(() => organizationSubscriptions.id, { onDelete: "set null" }),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("PH").notNull(),

  provider: varchar("provider", { length: 50 }).notNull(),
  checkoutSessionId: varchar("checkout_session_id", { length: 255 }).unique(),
  providerPaymentId: varchar("provider_payment_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(),

  paidAt: timestamp("paid_at"),
  ...timestamps
}, (table) => {
  return {
    subscriptionPaymentsOrganizationCreatedAtIdx: index("subscription_payments_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    subscriptionPaymentsSubscriptionIdIdx: index("subscription_payments_subscription_id_idx")
      .on(table.subscriptionId),
  };
});

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', {length: 100}).notNull(),
  slug: varchar('slug', { length: 100}).unique(),
  logoUrl: text('logo_url'),
  plan: planEnum('plan').default('free').notNull(),
  logoHash: text('logo_hash'),
  ...timestamps
})

// user

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer('organization_id')
                  .references(() => organizations.id, { onDelete: 'cascade'}),
  name: varchar("name", { length: 100}).notNull(),
  lastName: varchar('last_name', { length: 100}).notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum('role').default('member').notNull(),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  status: statusEnum('status').default('active'),
  ...timestamps
}, (table) => {
  return {
    usersOrganizationCreatedAtIdx: index("users_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    usersOrganizationStatusIdx: index("users_organization_status_idx")
      .on(table.organizationId, table.status),
  };
});

export const organizationInvites = pgTable('organization_invites', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade'}),
  code: uuid('code').defaultRandom().notNull().unique(),
  role: inviteRoleEnum('role').default('member').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdById: integer('created_by_id')
    .notNull()
    .references(() => users.id),
  ...timestamps
}, (table) => {
  return {
    organizationInvitesOrganizationCreatedAtIdx: index("organization_invites_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    organizationInvitesOrganizationExpiresAtIdx: index("organization_invites_organization_expires_at_idx")
      .on(table.organizationId, table.expiresAt),
    organizationInvitesCreatedByIdIdx: index("organization_invites_created_by_id_idx")
      .on(table.createdById),
  };
});

// clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  
  company: varchar("company", { length: 255 }),
  taxId: varchar("tax_id", { length: 100 }),
  // Billing address
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),

  barangay: varchar("barangay", { length: 100 }),
  province: varchar("province", { length: 100 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),

  contactPerson: varchar("contact_person", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),

  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  // Preferences
  currency: currencyEnum("currency").default("PH").notNull(),
  notes: text("notes"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientsOrganizationCreatedAtIdx: index("clients_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    clientsOrganizationCurrencyIdx: index("clients_organization_currency_idx")
      .on(table.organizationId, table.currency),
  };
});

// products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).default("item"), // e.g. "hour", "item", "seat"
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    productsOrganizationCreatedAtIdx: index("products_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
  };
});

// invocies
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
 
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(), // e.g. INV-0042
  status: invoiceStatusEnum("status").default("draft").notNull(),
  currency: currencyEnum("currency").default("PH").notNull(),
 
  // Dates
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  paidAt: timestamp("paid_at"),
 
  // Amounts (stored as strings for precision)
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).default("0"),
  amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull(),
 
  // Content
  notes: text("notes"),           // shown on invoice
  internalNotes: text("internal_notes"), // hidden from client
  footer: text("footer"),         // e.g. "Thank you for your business"
 
  // PDF
  pdfUrl: text("pdf_url"),
 
  // Recurring reference
  recurringInvoiceId: integer("recurring_invoice_id")
    .references(() => recurringInvoices.id, { onDelete: "set null" }),
 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    recurringInvoiceIssueDateUnique: uniqueIndex("invoices_recurring_invoice_issue_date_unique")
      .on(table.recurringInvoiceId, table.issueDate),
    invoicesOrganizationCreatedAtIdx: index("invoices_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    invoicesOrganizationStatusCreatedAtIdx: index("invoices_organization_status_created_at_idx")
      .on(table.organizationId, table.status, table.createdAt),
    invoicesOrganizationCurrencyCreatedAtIdx: index("invoices_organization_currency_created_at_idx")
      .on(table.organizationId, table.currency, table.createdAt),
    invoicesOrganizationIssueDateIdx: index("invoices_organization_issue_date_idx")
      .on(table.organizationId, table.issueDate),
    invoicesOrganizationDueDateIdx: index("invoices_organization_due_date_idx")
      .on(table.organizationId, table.dueDate),
    invoicesClientIdIdx: index("invoices_client_id_idx")
      .on(table.clientId),
  };
});

// invoice items 
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
 
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"), // percentage
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
 
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    invoiceItemsInvoiceIdIdx: index("invoice_items_invoice_id_idx")
      .on(table.invoiceId),
    invoiceItemsProductIdIdx: index("invoice_items_product_id_idx")
      .on(table.productId),
  };
});

// payemnts
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
 
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("PH").notNull(),
  method: paymentMethodEnum("method").notNull(),
  reference: varchar("reference", { length: 255 }), // e.g. gcash charge ID
  note: text("note"),
  paidAt: timestamp("paid_at").notNull(),
 
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    paymentsOrganizationCreatedAtIdx: index("payments_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    paymentsOrganizationInvoiceIdIdx: index("payments_organization_invoice_id_idx")
      .on(table.organizationId, table.invoiceId),
    paymentsInvoiceIdIdx: index("payments_invoice_id_idx")
      .on(table.invoiceId),
  };
});

// recurring invoices
export const recurringInvoices = pgTable("recurring_invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  createdById: integer('created_by_id')
    .references(() => users.id, { onDelete: "cascade"}),
  interval: recurringIntervalEnum("interval").notNull(),
  nextIssueDate: timestamp("next_issue_date").notNull(),
  endDate: timestamp("end_date"),           // null = runs forever
  autoSend: boolean("auto_send").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
 
  // Template data (mirrors invoice fields)
  currency: currencyEnum("currency").default("PH").notNull(),
  notes: text("notes"),
  footer: text("footer"),
  dueDaysAfterIssue: integer("due_days_after_issue").default(30).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    recurringInvoicesOrganizationCreatedAtIdx: index("recurring_invoices_organization_created_at_idx")
      .on(table.organizationId, table.createdAt),
    recurringInvoicesOrganizationActiveCreatedAtIdx: index("recurring_invoices_organization_active_created_at_idx")
      .on(table.organizationId, table.isActive, table.createdAt),
    recurringInvoicesOrganizationIntervalCreatedAtIdx: index("recurring_invoices_organization_interval_created_at_idx")
      .on(table.organizationId, table.interval, table.createdAt),
    recurringInvoicesDueJobIdx: index("recurring_invoices_due_job_idx")
      .on(table.isActive, table.autoSend, table.nextIssueDate),
    recurringInvoicesClientIdIdx: index("recurring_invoices_client_id_idx")
      .on(table.clientId),
  };
});

// recurring invoice items
export const recurringInvoiceItems = pgTable("recurring_invoice_items", {
  id: serial("id").primaryKey(),
  recurringInvoiceId: integer("recurring_invoice_id")
    .notNull()
    .references(() => recurringInvoices.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
}, (table) => {
  return {
    recurringInvoiceItemsRecurringInvoiceIdIdx: index("recurring_invoice_items_recurring_invoice_id_idx")
      .on(table.recurringInvoiceId),
    recurringInvoiceItemsProductIdIdx: index("recurring_invoice_items_product_id_idx")
      .on(table.productId),
  };
});


// RELATIONS

export const organizationSubscriptionRelations = relations(organizationSubscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [organizationSubscriptions.organizationId],
    references: [organizations.id]
  }),
  payments: many(subscriptionPayments)
}))

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptionPayments.organizationId],
    references: [organizations.id],
  }),
  subscription: one(organizationSubscriptions, {
    fields: [subscriptionPayments.subscriptionId],
    references: [organizationSubscriptions.id],
  }),
}))

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  subscription: one(organizationSubscriptions, {
    fields: [organizations.id],
    references: [organizationSubscriptions.organizationId],
  }),
  users: many(users),
  invites: many(organizationInvites),
  clients: many(clients),
  products: many(products),
  invoices: many(invoices),
  payments: many(payments),
  subscriptionPayments: many(subscriptionPayments),
  recurringInvoices: many(recurringInvoices),
  auditLogs: many(auditLog)
}))

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id]
  }),
  createdInvites: many(organizationInvites),
  auditLogs: many(auditLog)
}))

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLog.organizationId],
    references: [organizations.id]
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id]
  })
}))

export const organizationInvitesRelations = relations(organizationInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvites.organizationId],
    references: [organizations.id]
  }),
  createdBy: one(users, {
    fields: [organizationInvites.createdById],
    references: [users.id]
  })
}))

export const clientRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id]
  }),
  invoices: many(invoices),
  recurringInvoices: many(recurringInvoices)
}))

export const productRelations = relations(products, ({ one, many}) => ({
    organization: one(organizations, {
      fields: [products.organizationId],
      references: [organizations.id]
    }),
    invoiceItems: many(invoiceItems)
}))

export const invoicesRelations = relations(invoices, ({one, many}) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id]
  }),
  user: one(users, {
    fields: [invoices.createdById],
    references: [users.id]
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id]
  }),
  items: many(invoiceItems),
  payment: many(payments)
}))

export const invoiceItemsRelations = relations(invoiceItems, ({one}) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  })
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
}));
 
export const recurringInvoicesRelations = relations(
  recurringInvoices,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [recurringInvoices.organizationId],
      references: [organizations.id],
    }),
    client: one(clients, {
      fields: [recurringInvoices.clientId],
      references: [clients.id],
    }),
    items: many(recurringInvoiceItems),
  })
);
 
export const recurringInvoiceItemsRelations = relations(
  recurringInvoiceItems,
  ({ one }) => ({
    recurringInvoice: one(recurringInvoices, {
      fields: [recurringInvoiceItems.recurringInvoiceId],
      references: [recurringInvoices.id],
    }),
    product: one(products, {
      fields: [recurringInvoiceItems.productId],
      references: [products.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type NewOrganizationInvite = typeof organizationInvites.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type RecurringInvoice = typeof recurringInvoices.$inferSelect;
export type NewRecurringInvoice = typeof recurringInvoices.$inferInsert;
export type RecurringInvoiceItem = typeof recurringInvoiceItems.$inferSelect;
export type NewRecurringInvoiceItem = typeof recurringInvoiceItems.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

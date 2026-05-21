import { relations } from "drizzle-orm";
import { pgEnum, varchar, pgTable, serial, text, timestamp, uuid, boolean, integer, numeric} from "drizzle-orm/pg-core";

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

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'admin',
  'member'
])

export const inviteRoleEnum = pgEnum('invite_role', [
  'admin',
  'member'
])

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
} 
// organization (multi-tenacy)

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', {length: 100}).notNull(),
  slug: varchar('slug', { length: 100}).unique(),
  logoUrl: text('logo_url'),
  plan: planEnum('plan').default('free').notNull(),
  ...timestamps
})

// user

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer('organization_id')
                  .notNull()
                  .references(() => organizations.id, { onDelete: 'cascade'}),
  name: varchar("name", { length: 100}).notNull(),
  lastName: varchar('last_name', { length: 100}).notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum('role').default('member').notNull(),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  ...timestamps
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
});

// clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  taxId: varchar("tax_id", { length: 100 }),
  // Billing address
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  // Preferences
  currency: currencyEnum("currency").default("PH").notNull(),
  notes: text("notes"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  currency: currencyEnum("currency").default("USD").notNull(),
 
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
  recurringInvoiceId: integer("recurring_invoice_id"),
 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  currency: currencyEnum("currency").default("USD").notNull(),
  method: paymentMethodEnum("method").notNull(),
  reference: varchar("reference", { length: 255 }), // e.g. gcash charge ID
  note: text("note"),
  paidAt: timestamp("paid_at").notNull(),
 
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
});


// RELATIONS

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  invites: many(organizationInvites),
  clients: many(clients),
  products: many(products),
  invoices: many(invoices),
  payments: many(payments),
  recurringInvoices: many(recurringInvoices)
}))

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id]
  }),
  createdInvites: many(organizationInvites)
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

import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm"
import { db } from "../db/db.js"
import { AppError } from "../utils/appError.js"
import { getFirstZodMessage } from "../utils/zodErrors.js"
import { DashboardSchema } from "../validation/dashboard.validation.js"
import { clients, invoices, organizationInvites, organizations, payments, products, recurringInvoices, users } from "../db/schema.js"

export const ownerDashboard = async (id: unknown) => {
    const parsed = DashboardSchema.safeParse(id)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const organizationId = parsed.data.organizationId

    const [
        [invoiceTotals],
        [paidInvoices],
        [overdueInvoices],
        [activeRecurringInvoices],
        [organizationPlan],
        [clientTotals],
        [productTotals],
        [invitationtotals],
        [ownerTotals],
        [adminTotals],
        [memberTotals],
        [pendingInvitationsTotal],
        pendingInvitations,
        recentInvoices,
        recentPayments
    ] = await Promise.all([

        // invoice totals
        db.select({
            totalInvoices: sql<number>`count(*)`,
            totalInvoiceAmount: sql<string>`coalesce(sum(${invoices.total}), 0)`,
            totalPaidAmount: sql<string>`coalesce(sum(${invoices.amountPaid}), 0)`,
            totalDueAmount: sql<string>`coalesce(sum(${invoices.amountDue}), 0)`,
        })
            .from(invoices)
            .where(eq(invoices.organizationId, organizationId)),

        // total paid invoice
        db.select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, organizationId),
                eq(invoices.status, 'paid')
            )),
        
        // total overdue invoice
        db.select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, organizationId),
                eq(invoices.status, 'overdue')
            )),

        // total active recurring invoices
        db.select({ count: sql<number>`count(*)` })
            .from(recurringInvoices)
            .where(and(
                eq(recurringInvoices.organizationId, organizationId),
                eq(recurringInvoices.isActive, true)
            )),
        
        // organization subscription pan
        db.select({
            plan: organizations.plan
        })
            .from(organizations)
            .where(eq(organizations.id, organizationId)),

        // total clients
        db.select({ count: sql<number>`count(*)`})
            .from(clients)
            .where(
                eq(clients.organizationId, organizationId),
            ),

        // total products
        db.select({ count: sql<number>`count(*)`})
            .from(products)
            .where(eq(products.organizationId, organizationId)),

        // total organization invites
        db.select({ count: sql<number>`count(*)`})
            .from(organizationInvites)
            .where(eq(organizationInvites.organizationId, organizationId)),

        // total owner
        db.select({ count: sql<number>`count(*)`})
            .from(users)
            .where(and(
                eq(users.organizationId, organizationId),
                eq(users.role, 'owner')
            )),

        // total admin
        db.select({ count: sql<number>`count(*)`})
            .from(users)
            .where(and(
                eq(users.organizationId, organizationId),
                eq(users.role, 'admin')
            )),

        // total member
        db.select({ count: sql<number>`count(*)`})
            .from(users)
            .where(and(
                eq(users.organizationId, organizationId),
                eq(users.role, 'member')
            )),

        // organization pending invitation
        db.select({ count: sql<number>`count(*)`})
            .from(organizationInvites)
            .where(and(
                eq(organizationInvites.organizationId, organizationId),
                isNull(organizationInvites.usedAt)
            )),
        
        // organization pending invitation with details
        db.query.organizationInvites.findMany({
            where: and(
                eq(organizationInvites.organizationId, organizationId),
                isNull(organizationInvites.usedAt)
            ),
            columns: {
                code: true,
                role: true,
                expiresAt: true,
                createdAt: true,
            },
            orderBy: desc(organizationInvites.createdAt),
            limit: 5,
        }),

        // recemt invoices
        db.query.invoices.findMany({
            where: eq(invoices.organizationId, organizationId),
            columns: {
                id: true,
                invoiceNumber: true,
                status: true,
                currency: true,
                total: true,
                amountPaid: true,
                amountDue: true,
                issueDate: true,
                dueDate: true,
                createdAt: true,
            },
            with: {
                client: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: desc(invoices.createdAt),
            limit: 5,
        }),

        // recent payments 
        db.query.payments.findMany({
            where: eq(payments.organizationId, organizationId),
            columns: {
                id: true,
                invoiceId: true,
                amount: true,
                currency: true,
                method: true,
                reference: true,
                paidAt: true,
                createdAt: true,
            },
            with: {
                invoice: {
                    columns: {
                        id: true,
                        invoiceNumber: true,
                        status: true,
                        amountDue: true,
                    },
                    with: {
                        client: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    }
                }
            },
            orderBy: desc(payments.createdAt),
            limit: 5,
        })
    ])

    if (!organizationPlan) {
        throw new AppError('Organization is not found.', 404)
    }

    return {
        plan: {
            organizationPlan: organizationPlan.plan,
            clientTotals: Number(clientTotals?.count ?? 0),
            productTotals: Number(productTotals?.count ?? 0),
            invitationTotals: Number(invitationtotals?.count ?? 0)
        },
        teamSummary: {
            totalOwner: Number(ownerTotals.count ?? 0),
            totalAdmin: Number(adminTotals.count ?? 0),
            totalMember: Number(memberTotals.count ?? 0),
            pendingInvitations: Number(pendingInvitationsTotal.count ?? 0),
        },
        summary: {
            totalInvoices: Number(invoiceTotals?.totalInvoices ?? 0),
            paidInvoices: Number(paidInvoices?.count ?? 0),
            overdueInvoices: Number(overdueInvoices?.count ?? 0),
            activeRecurringInvoices: Number(activeRecurringInvoices?.count ?? 0),
            totalInvoiceAmount: Number(invoiceTotals?.totalInvoiceAmount ?? 0).toFixed(2),
            totalPaidAmount: Number(invoiceTotals?.totalPaidAmount ?? 0).toFixed(2),
            totalDueAmount: Number(invoiceTotals?.totalDueAmount ?? 0).toFixed(2),
        },
        pendingInvitations,
        recentInvoices,
        recentPayments,
    }
}


export const adminDashboard = async (id: unknown) => {
    const parsed = DashboardSchema.safeParse(id)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { organizationId } = parsed.data

    const [
        [amountDueTotals],
        [draftTotals],
        [sentTotals],
        [paidTotals],
        [overDueTotal],
        [recentPaymentTotals],
        [recentClientTotals],
        [pendingInvitationTotals],
        recentPayments,
        recentClients,
        pendingInvitations,
        upcomingRecurringInvoices,
    ] = await Promise.all([
        // amount due totals
        db.select({ totalDueAmount: sql<string>`coalesce(sum(${invoices.amountDue}), 0)`})
            .from(invoices)
            .where(eq(invoices.organizationId, organizationId)),

        // draftTotals
        db.select({ count: sql<number>`count(*)`})
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, organizationId),
                eq(invoices.status, 'draft')
            )),

        // sentTotals
        db.select({ count: sql<number>`count(*)`})
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, organizationId),
                eq(invoices.status, 'sent')
            )),

        // paidTotals
        db.select({ count: sql<number>`count(*)`})
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, organizationId),
                eq(invoices.status, 'paid')
            )),

        // overdueTotals
        db.select({ count: sql<number>`count(*)`})
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, organizationId),
                eq(invoices.status, 'overdue')
            )),

        // total payments
        db.select({ count: sql<number>`count(*)`})
            .from(payments)
            .where(eq(
                payments.organizationId,
                organizationId
            )),
        
        // total clients
        db.select({ count: sql<number>`count(*)`})
            .from(clients)
            .where(eq(clients.organizationId, organizationId)),

        // total pending invitations
        db.select({ count: sql<number>`count(*)`})
            .from(organizationInvites)
            .where(and(
                eq(organizationInvites.organizationId, organizationId),
                isNull(organizationInvites.usedAt)
            )), 

        // recent payments
        db.query.payments.findMany({
            where: and(
                eq(payments.organizationId, organizationId),
            ),
            columns: {
                id: true,
                invoiceId: true,
                amount: true,
                currency: true,
                method: true,
                reference: true,
                paidAt: true,
                createdAt: true,
            },
            with: {
                invoice: {
                    columns: {
                        id: true,
                        invoiceNumber: true,
                        status: true,
                        amountDue: true,
                    },
                    with: {
                        client: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    }
                }
            },
            orderBy: desc(payments.createdAt),
            limit: 5
        }),

        // recent clients
        db.query.clients.findMany({
            where: and(eq(clients.organizationId, organizationId)),
            columns: {
                name: true,
                email: true,
                contactPhone: true,
                company: true
            },
            orderBy: desc(clients.createdAt),
            limit: 5
        }),

        // pending invitations
        db.query.organizationInvites.findMany({
            where: and(
                eq(organizationInvites.organizationId, organizationId),
                isNull(organizationInvites.usedAt)
            ),
            columns: {
                code: true,
                role: true,
                expiresAt: true,
                createdAt: true,
            },
            orderBy: desc(organizationInvites.createdAt),
            limit: 5
        }),

        // upcoming recurring invoices
        db.query.recurringInvoices.findMany({
            where: and(
                eq(recurringInvoices.organizationId, organizationId),
                eq(recurringInvoices.isActive, true)
            ),
            columns: {
                id: true,
                interval: true,
                nextIssueDate: true,
                endDate: true,
                autoSend: true,
                currency: true,
            },
            with: {
                client: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: asc(recurringInvoices.nextIssueDate),
            limit: 5
        })
    ])

    return {
        invoiceStatus: {
            amountDueTotals: Number(amountDueTotals.totalDueAmount ?? 0),
            draftTotals: Number(draftTotals.count ?? 0),
            sentTotals: Number(sentTotals.count ?? 0),
            paidTotals: Number(paidTotals.count ?? 0),
            overDueTotals: Number(overDueTotal.count ?? 0),
        },
        client: {
            recentClientTotals,
            recentClients
        },
        payment: {
            recentPaymentTotals,
            recentPayments
        },
        invitations: {
            pendingInvitationTotals,
            pendingInvitations
        },
        upcomingRecurringInvoices
    }
}

export const memberDashboard = async (id: unknown) => {
    const parsed = DashboardSchema.safeParse(id)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { organizationId } = parsed.data

    const [
        [clientTotals],
        recentClients,
        [invoiceTotals],
        recentInvoices,
        [unpaidInvoiceTotals],
        recentPayments,
    ] = await Promise.all([
        // client totals
        db.select({ count: sql<number>`count(*)`})
            .from(clients)
            .where(eq(clients.organizationId, organizationId)),
        
        // recent clients
        db.query.clients.findMany({
            where: eq(clients.organizationId, organizationId),
            columns: {
                name: true,
                email: true,
                contactPhone: true,
                company: true
            },
            orderBy: desc(clients.createdAt),
            limit: 5
        }),

        // invoice totals
        db.select({ counts: sql<number>`count(*)`})
            .from(invoices)
            .where(eq(invoices.organizationId, organizationId)),

        // recent invoice
        db.query.invoices.findMany({
            where: eq(invoices.organizationId, organizationId),
             columns: {
                id: true,
                invoiceNumber: true,
                status: true,
                currency: true,
                total: true,
                amountPaid: true,
                amountDue: true,
                issueDate: true,
                dueDate: true,
                createdAt: true,
            },
            with: {
                client: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: desc(invoices.createdAt),
            limit: 5
        }),

        // unpaid invoice totals
        db.select({
            count: sql<number>`count(*)`,
            totalDueAmount: sql<string>`coalesce(sum(${invoices.amountDue}), 0)`,
        })
            .from(invoices)
            .where(and(
                eq(invoices.organizationId, organizationId),
                gt(invoices.amountDue, '0')
            )),

        // recent payments
        db.query.payments.findMany({
            where: eq(payments.organizationId, organizationId),
             columns: {
                id: true,
                invoiceId: true,
                amount: true,
                currency: true,
                method: true,
                reference: true,
                paidAt: true,
                createdAt: true,
            },
            with: {
                invoice: {
                    columns: {
                        id: true,
                        invoiceNumber: true,
                        status: true,
                        amountDue: true,
                    },
                    with: {
                        client: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    }
                }
            },
            orderBy: desc(payments.createdAt),
            limit: 5
        })
    ])

    return {
        client: {
            clientTotals,
            recentClients
        },
        invoice: {
            totalInvoices: Number(invoiceTotals?.counts ?? 0),
            unpaidInvoices: Number(unpaidInvoiceTotals?.count ?? 0),
            unpaidInvoiceAmount: Number(unpaidInvoiceTotals?.totalDueAmount ?? 0).toFixed(2),
            recentInvoices
        },
        recentPayments
    }
}

import { and, eq, sql } from "drizzle-orm"
import { db } from "../db/db.js"
import { clients, invoices, recurringInvoices } from "../db/schema.js"
import { AppError } from "../utils/appError.js"
import { getFirstZodMessage } from "../utils/zodErrors.js"
import { CreateClientSchema, DeleteClientSchema, GetSingleClientSchena, UpdateClientSchema } from "../validation/clients.validation.js"
import { clientsFilter } from "../utils/clients.utils.js"
import { getOrganizationEntitlements } from "./subscription.services.js"

export const createClient = async (data: unknown) => {
    const parsed = CreateClientSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {
        organizationId,fullName,email, contactPerson,contactPhone,
        barangay,province,region,currency,company,taxId,addressLine1,
        addressLine2,city,state,postalCode,country,notes
     } = parsed.data

     const entitlements = await getOrganizationEntitlements(organizationId)
    
    if(entitlements.maxClients !== null) {
        const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                    .from(clients)
                                    .where(eq(clients.organizationId, organizationId))


        if (Number(count) >= entitlements.maxClients) {
            throw new AppError(`Your ${entitlements.effectivePlan} plan allows up to ${entitlements.maxClients} clients.`, 403)
        }                
    }

     const client = await db.insert(clients)
                            .values({
                                organizationId,
                                name: fullName,email, contactPerson,contactPhone,
                                barangay,province,region,currency: currency ?? "PH",company,taxId,addressLine1,
                                addressLine2,city,state,postalCode,country,notes
                            })
                            .returning({
                                id: clients.id,
                                organizationId: clients.organizationId,
                                name: clients.name,
                                email: clients.email,
                            })

    if (!client) {
        throw new AppError('Failed to create client', 400)
    }

    return client
}

export const getAllClients = async (organizationId: number, query: unknown) => {
    if (typeof organizationId !== 'number' || organizationId < 0) {
        throw new AppError('Invalid data', 400)
    }

    if (!organizationId) throw new AppError('Organization id is required', 400)

    const {
        filters,
        page,
        limit,
        offSet,
        totalPages,
        orderBy,
        total
    } = await clientsFilter(organizationId, query)

    const clients = await db.query.clients.findMany({
        where: and(...filters),
        columns: {
            createdAt: false,
            updatedAt: false,
            isArchived: false,
            organizationId: false,
        },
        orderBy,
        limit,
        offset: offSet
    })

    return {
        clients,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    }
}

export const getSingleClient = async (ids: unknown) => {
    const parsed = GetSingleClientSchena.safeParse(ids)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid Data'

        throw new AppError(msg, 400)
    }

    const client = await db.query.clients.findFirst({
        where: and(
            eq(clients.id, parsed.data.clientId),
            eq(clients.organizationId, parsed.data.organizationId)
        ),
        columns: {
            createdAt: false,
            updatedAt: false,
            organizationId: false,
            isArchived: false
        }
    })

    if(!client) {
        throw new AppError('Client not found', 404)
    }

    return client
}

export const updateClient = async (clientId: number, organizationId: number, data: unknown) => {
    const parsed = UpdateClientSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    if(!Number.isInteger(organizationId) || organizationId <= 0) {
        throw new AppError('Invalid data', 400)
    }

    if(!Number.isInteger(clientId) || clientId <= 0) {
        throw new AppError('Invalid data', 400)
    }

    const { fullName, ...rest } = parsed.data

    const updatedData = Object.fromEntries(
        Object.entries({
            ...rest,
            name: fullName
        }).filter(([_, value]) => value !== undefined)
    )

    if(Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update', 400)
    }

    const client = await db.query.clients.findFirst({
        where: and(
            eq(clients.organizationId, organizationId),
            eq(clients.id, clientId)
        ),
        columns: {
            createdAt: false,
            updatedAt: false
        }
      }
    )

    if(!client) {
        throw new AppError('Client not found', 404)
    }

    const [updatedClient] = await db.update(clients)
                                    .set({
                                        ...updatedData
                                    })
                                    .where(
                                        and(
                                            eq(clients.organizationId, organizationId),
                                            eq(clients.id, clientId)
                                        )
                                    )
                                    .returning({
                                        id: clients.id,
                                        name: clients.name,
                                        email: clients.email,
                                    })

    if (!updatedClient) {
        throw new AppError('Failed to update client.')
    }

    return updatedClient
}

export const deleteClient = async (ids: unknown) => {
    const parsed = DeleteClientSchema.safeParse(ids)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {clientId, organizationId} = parsed.data

    const [existingClient] = await db.select({
                                        id: clients.id
                                    })
                                     .from(clients)
                                     .where(and(
                                        eq(clients.id, clientId),
                                        eq(clients.organizationId, organizationId)
                                     ))

    if(!existingClient) {
        throw new AppError('Client not found', 404)
    }

    const [[existingInvoice], [existingRecurringInvoice]] = await Promise.all([
        db.select({ id: invoices.id })
            .from(invoices)
            .where(and(
                eq(invoices.clientId, clientId),
                eq(invoices.organizationId, organizationId)
            ))
            .limit(1),
        db.select({ id: recurringInvoices.id })
            .from(recurringInvoices)
            .where(and(
                eq(recurringInvoices.clientId, clientId),
                eq(recurringInvoices.organizationId, organizationId)
            ))
            .limit(1)
    ])

    if (existingInvoice || existingRecurringInvoice) {
        throw new AppError(
            'This client cannot be deleted because it has invoices or recurring invoice schedules. Delete those records first.',
            409
        )
    }

    const [deletedClient] = await db.delete(clients)
                                    .where(and(
                                        eq(clients.id, existingClient.id),
                                        eq(clients.organizationId, organizationId)
                                    ))
                                    .returning({
                                        name: clients.name
                                    })
    
    if (!deletedClient) {
        throw new AppError('Failed to delete client.', 400)
    }

    return deletedClient
}

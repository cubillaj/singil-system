import { and, eq, ne } from "drizzle-orm";
import { db } from "../db/db.js";
import { AppError } from "../utils/appError.js";
import { getFirstZodMessage } from "../utils/zodErrors.js";
import { DeleteOrganizationSchema, OrganizationUpdateUserSchema, SingleUserOrganization, SingleUserOrganizationSchema, UpdateOrganizationSchema } from "../validation/organization.validation.js";
import { organizations, users } from "../db/schema.js";
import { createSlug } from "../utils/slug.js";
import { organizationFilters } from "../utils/organization.utils.js";

type UserRole = 'admin' | 'owner'
export const getOrganizationMembersAndAdmin = async (organizationId: number, userRole: UserRole, query: unknown) => {

     if(typeof organizationId !== 'number') {
            throw new AppError('Invalid data', 400)
        }

        if (!organizationId) throw new AppError('Organization id is required', 400)
    
    const {
        filters,
        offSet,
        total,
        totalPages,
        limit,
        orderBy,
        page
    } = await organizationFilters(userRole, organizationId, query)

    const organizationMembers = await db.query.users.findMany({
        where: and(...filters),
        columns: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            role: true,
            status: true,
            createdAt: true
        },
        orderBy,
        limit,
        offset: offSet
    })

    return {
        members: organizationMembers,
        pagination: {
            total,
            totalPages,
            page,
            limit
        }
    }

}

export const getOrganizationSingleUsers = async (ids: unknown) => {
    const parsed = SingleUserOrganizationSchema.safeParse(ids)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {organizationId, userId} = parsed.data

    const [user] = await db.select({
                            name: users.name,
                            lastName: users.lastName,
                            email: users.email,
                            role: users.role
                        })
                         .from(users)
                         .where(and(
                            eq(users.id, userId),
                            ne(users.role, 'system_admin'),
                            eq(users.organizationId, organizationId)
                         ))

    if (!user) {
        throw new AppError('User not found', 404)
    }

    return user
}

export const updateOrganizationUsers = async (data: unknown) => {

    const parsed = OrganizationUpdateUserSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const { userId, targetUser, organizationId, ...userUpdateData } = parsed.data

    const updatedData = Object.fromEntries(
        Object.entries(userUpdateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update', 400)
    }

    const [[userToBeUpdated], [existingUser]] = await Promise.all([
        db.select({
            id: users.id,
            organizationId: users.organizationId,
            role: users.role
        })
            .from(users)
            .where(and(
                eq(users.id, targetUser),
                eq(users.organizationId, organizationId)
            )),
        db.select({
                    id: users.id,
                    organizationId: users.organizationId,
                    role: users.role
                })
                    .from(users)
                    .where(and(
                            eq(users.id, userId),
                            eq(users.organizationId, organizationId)
                 )) 
    ])
    if (!userToBeUpdated) throw new AppError('User not found', 404)

    if (!existingUser) throw new AppError('User not found', 404)

    if (userToBeUpdated.role === 'system_admin') {
        throw new AppError('Cannot update system admin users', 403)
    }

    if (existingUser.role !== 'owner' && existingUser.role !== 'admin') {
        throw new AppError('Forbidden', 403)
    }

    if (existingUser.role === 'admin' && userToBeUpdated.role !== 'member') {
        throw new AppError('Admins can only update members', 403)
    }

    if (updatedData.role === 'owner' && existingUser.role !== 'owner') {
        throw new AppError('Only owners can assign owner role', 403)
    }

    const [updatedUser] = await db.update(users)
                                .set({
                                    ...updatedData
                                })
                                .where(and(
                                    eq(users.id, userToBeUpdated.id),
                                    eq(users.organizationId, organizationId),
                                    ne(users.role, 'system_admin')
                                ))
                                .returning({
                                    id: users.id,
                                    name: users.name,
                                    lastName: users.lastName,
                                    role: users.role,
                                    status: users.status,
                                })
                            
    if (!updatedUser) throw new AppError('Failed to update user', 400)

    return updatedUser
}

export const deleteOrganizationUsers = async (data: unknown) => {

    const parsed = DeleteOrganizationSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {targetUser, userId, userRole, organizationId} = parsed.data

    if (targetUser === userId) {
        throw new AppError('You cannot delete your own account', 400)
    }

    const [existingUser] = await db.select({
        name: users.name,
        id: users.id,
        role: users.role
    })
                                    .from(users)
                                    .where(and(
                                    eq(users.id, targetUser),
                                    ne(users.role, 'system_admin'),
                                    eq(users.organizationId, organizationId)
                                    ))

    if(!existingUser) throw new AppError('User not found', 404)

    if (userRole === 'admin' && existingUser.role !== 'member') {
        throw new AppError('Admins can only delete members', 403)
    }

    const [deletedUser] = await db.delete(users)
                                .where(and(
                                    eq(users.id, existingUser.id),
                                    eq(users.organizationId, organizationId),
                                    ne(users.role, 'system_admin')
                                ))
                                .returning({
                                    id: users.id,
                                    name: users.name,
                                    lastName: users.lastName,
                                    role: users.role,
                                    status: users.status
                                })

    if (!deletedUser) {
        throw new AppError('Failed to delete user', 400)
    }

    return deletedUser
}

export const updateOrganization  = async (userId: number, organizationId: number | null, data: unknown) => {
    const parsed = UpdateOrganizationSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    if (organizationId === null) {
        throw new AppError('Organization is required', 400)
    }
    
    // Keep PATCH-like behavior: only send fields the client actually provided.
    const updatedData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update', 400)
    }

    // Confirm the user belongs to this organization and read the current logo hash for duplicate checks.
    const [existingUser] = await db.select({
                                id: users.id,
                                logoUrl: organizations.logoUrl,
                                logoHash: organizations.logoHash
                                })
                                .from(users)
                                .leftJoin(organizations, eq(users.organizationId, organizations.id))
                                .where(and(
                                    eq(users.organizationId, organizationId),
                                    eq(users.id, userId)
                                ))

    if(!existingUser) {
        throw new AppError('User is not found', 404)
    }   

    // Block re-uploading the exact same current image before updating the organization record.
    if (
        updatedData.logoHash !== undefined &&
        existingUser.logoHash === updatedData.logoHash
    ) {
        throw new AppError('Image logo is the same, please change it.', 400)
    }

    // Regenerate the slug only when the organization name changes.
    const updateValues = {
        ...updatedData,
        ...(parsed.data.name ? { slug: createSlug(parsed.data.name)} : {})
    }

    const [updateOrganization] = await db.update(organizations)
                                         .set(updateValues)
                                        .where(eq(organizations.id, organizationId))
                                         .returning({
                                            slug: organizations.slug,
                                            logoUrl: organizations.logoUrl,
                                            name: organizations.name
                                         })

    if (!updateOrganization) {
        throw new AppError('Failed to update organization', 400)
    }

    return updateOrganization
}

import bcrypt from 'bcrypt'
import { UpdateUserSchema, UserChangePasswordSchema, UserQuerySchema } from '../validation/user.validation.js'
import { AppError } from '../utils/appError.js'
import { getFirstZodMessage } from '../utils/zodErrors.js'
import { db } from '../db/db.js'
import { clients, users } from '../db/schema.js'
import { and, asc, desc, eq, gte, ilike, lte, ne, or, sql, SQL } from 'drizzle-orm'

export const changePassword = async (data: unknown) => {
    const parsed = UserChangePasswordSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const {userId, currentPassword, newPassword} = parsed.data

    const [existingUser] = await db.select({
        id: users.id,
        passwordHash: users.passwordHash,
        role: users.role
    })
                                    .from(users)
                                    .where(
                                        eq(users.id, userId)
                                    )

    if(!existingUser) {
        throw new AppError('User not found', 404)
    }

    const matchPrevPassword = await bcrypt.compare(currentPassword, existingUser.passwordHash)

    if(!matchPrevPassword) throw new AppError('Current password is incorrect.', 400)

    const matchPassword = await bcrypt.compare(newPassword, existingUser.passwordHash)

    if(matchPassword) throw new AppError('New password must be different from previous password.', 400)

    const hashPassword = await bcrypt.hash(newPassword, 12)

    const [user] = await db.update(users)
                            .set({
                                passwordHash: hashPassword
                            })
                            .where(eq(users.id, userId))
                            .returning({
                                name: users.name
                            })

    if(!user) {
        throw new AppError('Failed to change password.', 400)
    }

    return user
}

export const updateUser = async (userId: number, data: unknown) => {
    const parsed = UpdateUserSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }

    const updatedData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    )

    if(Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update', 400)
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true
        }
    })

    if(!user) throw new AppError('User is not found', 404)

    const [updatedUser] = await db.update(users)
                                    .set(updatedData)
                                    .where(eq(users.id, userId))
                                    .returning({
                                        id: users.id,
                                        name: users.name,
                                        lastName: users.lastName,
                                        email: users.email,
                                        avatarUrl: users.avatarUrl
                                    })

    if(!updatedUser) throw new AppError('Failed to update your info.', 400)

    return updatedUser
}

export const userInfo = async (userId: number) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            name: true,
            lastName: true,
            email: true,
            avatarUrl: true,
        }
    })

    if (!user) {
        throw new AppError('User not found', 404)
    }

    return user
}

export const getAllUsers = async (userId: number, query: unknown) => {
    const parsed = UserQuerySchema.safeParse(query)

    if(!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msg = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msg, 400)
    }

    const [user] = await db.select(
                            {role: users.role}
                            )
                            .from(users)
                            .where(and(
                                eq(users.id, userId),
                                eq(users.role, 'system_admin')
                            ))

    if(!user) {
        throw new AppError('User not found')
    }

    const {search, page, limit, createdFrom, createdTo, sortBy, sortOrder } = parsed.data

    const filters: SQL[] = [
        ne(users.role, 'system_admin')
    ]

    if (search) {
        const searchFilter = or(
            ilike(users.email, `%${search}%`)
        )

        if(searchFilter) {
            filters.push(searchFilter)
        }
    }

    if(createdFrom) filters.push(gte(users.createdAt, createdFrom))
    if (createdTo) filters.push(lte(users.createdAt, createdTo))
    
    const sortColumn = {
        createdAt: users.createdAt
    }[sortBy]

    const orderBy = 
                sortOrder === 'asc'
                    ? asc(sortColumn)
                    : desc(sortColumn)

    const offSet = (page - 1) * limit

    const [{count}] = await db.select({ count: sql<number>`count(*)`})
                                .from(users)
                                .where(and(...filters))

    const total = Number(count)
    const totalPages = Math.ceil(total / limit)

    const allUsers = await db.query.users.findMany({
        where: and(...filters),
        columns: {
            id: true,
            email: true,
        },
        with: {
            organization: {
                columns: {
                    name: true,
                    plan: true,
                }
            }
        },
        orderBy,
        limit,
        offset: offSet
    })

    return {
        allUsers,
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

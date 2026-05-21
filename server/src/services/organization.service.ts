import { and, eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { AppError } from "../utils/appError.js";
import { getFirstZodMessage } from "../utils/zodErrors.js";
import { UpdateOrganizationSchema } from "../validation/organization.validation.js";
import { organizations, users } from "../db/schema.js";
import { createSlug } from "../utils/slug.js";

export const updateOrganization  = async (userId: number, organizationId: number, data: unknown) => {
    const parsed = UpdateOrganizationSchema.safeParse(data)

    if(!parsed.success) {
        throw new AppError(getFirstZodMessage(parsed.error), 400)
    }
    
    const updatedData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(updatedData).length === 0) {
        throw new AppError('No fields to update', 400)
    }

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

    if (
        updatedData.logoHash !== undefined &&
        existingUser.logoHash === updatedData.logoHash
    ) {
        throw new AppError('Image logo is the same, please change it.', 400)
    }

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

import { uploadImageToCloudinary } from "../middleware/upload.middleware.js"
import * as OrganizationServices from "../services/organization.service.js"
import crypto from 'node:crypto'
import { Request, Response } from "express"
import { handleControllererror } from "../utils/handleController.js"
import { db } from "../db/db.js"
import { organizations } from "../db/schema.js"
import { eq } from "drizzle-orm"
import { AppError } from "../utils/appError.js"

// @desc    Update the authenticated user's organization profile and optional logo
// @route   PUT /api/organization/org-profile
// @access  Private/Admin/Owner
export const updateOrganizationController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        const organizationData = { ...req.body}

        if (req.file) {
            const logoHash = crypto
                .createHash('sha256')
                .update(req.file.buffer)
                .digest('hex')

            organizationData.logoHash = logoHash

            const [organization] = await db.select({
                logoHash: organizations.logoHash
            })
                .from(organizations)
                .where(eq(organizations.id, session.organizationId))

            if (!organization) {
                throw new AppError('Organization is not found', 404)
            }

            if (organization.logoHash === logoHash) {
                throw new AppError('Image logo is the same, please change it.', 400)
            }

            const uploded = await uploadImageToCloudinary(req.file, {
                folder: 'singil-system/organizationInfo',
            })

            organizationData.logoUrl = uploded.secure_url
        }

        const organization = await OrganizationServices
                                    .updateOrganization(
                                        session.userId,
                                        session.organizationId,
                                        organizationData
                                    )

        return res.status(200).json({
            message: 'Successfully updated organization',
            organization
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

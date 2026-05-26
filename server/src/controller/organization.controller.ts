import { uploadImageToCloudinary } from "../middleware/upload.middleware.js"
import * as OrganizationServices from "../services/organization.service.js"
import crypto from 'node:crypto'
import { Request, Response } from "express"
import { handleControllererror } from "../utils/handleController.js"
import { db } from "../db/db.js"
import { organizations } from "../db/schema.js"
import { eq } from "drizzle-orm"
import { AppError } from "../utils/appError.js"

export const getSingleOrganizationUserController = async (req: Request, res: Response) => {
    try {
        const userId: number = Number(req.params.id)

        if(!userId) return res.status(400).json({message: 'User id is required'})

        const session = req.authSession!

        const { organizationId } = session

        if(!organizationId) return res.status(400).json({message: 'User id is required'})
        const user = await OrganizationServices.getOrganizationSingleUsers({ 
            organizationId,
            userId
        })

        return res.status(200).json({
            user
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}


export const getOrganizationMembersAndAdminController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if (session.organizationId === null) {
            throw new AppError('Organization is required', 400)
        }

        if (session.role === 'system_admin' || session.role === 'member') {
            throw new AppError('Forbidden', 403)
        }

        const result = await OrganizationServices.getOrganizationMembersAndAdmin(
            session.organizationId,
            session.role,
            req.query
        )

        return res.status(200).json({
            ...result
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const updateUserOrganizationController = async (req: Request, res: Response) => {
    try {
        const targetUser = Number(req.params.id)
        const session = req.authSession!

        const updatedUser = await OrganizationServices.updateOrganizationUsers({
            targetUser,
            userId: session.userId,
            organizationId: session.organizationId,
            ...req.body
        })

        return res.status(200).json({
            message: 'Successfully updated user.',
            updatedUser
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const changeUserOrganizationPasswordController = async (req: Request, res: Response) => {
    try {
        const targetUser = Number(req.params.id)
        const session = req.authSession!

        if (!Number.isInteger(targetUser) || targetUser <= 0) {
            throw new AppError('Valid user id is required', 400)
        }

        if (session.organizationId === null) {
            throw new AppError('Organization is required', 400)
        }

        const user = await OrganizationServices.changePasswordOrganizationUsers({
            targetUser,
            userId: session.userId,
            userRole: session.role,
            organizationId: session.organizationId,
            ...req.body
        })

        return res.status(200).json({
            message: 'Successfully changed user password.',
            user
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const deleteUserOrganizationController = async (req: Request, res: Response) => {
    try {
        const targetUser = Number(req.params.id)
        const session = req.authSession!

        if (!Number.isInteger(targetUser) || targetUser <= 0) {
            throw new AppError('Valid user id is required', 400)
        }

        if (session.organizationId === null) {
            throw new AppError('Organization is required', 400)
        }

        const deletedUser = await OrganizationServices.deleteOrganizationUsers({
            targetUser,
            userId: session.userId,
            userRole: session.role,
            organizationId: session.organizationId
        })

        return res.status(200).json({
            message: 'Successfully deleted user.',
            deletedUser
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

// @desc    Update the authenticated user's organization profile and optional logo
// @route   PUT /api/organization/org-profile
// @access  Private/Admin/Owner
export const updateOrganizationController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if (session.organizationId === null) {
            throw new AppError('Organization is required', 400)
        }

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

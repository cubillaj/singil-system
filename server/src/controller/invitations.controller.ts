import * as InvitationService from '../services/invitation.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'

// @desc    Create an invitation for the authenticated user's organization
// @route   POST /api/invitation
// @access  Private/Admin/Owner
export const createInvitationController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        const {organizationId, userId } = session
        const invitation = await InvitationService
                                .createOrganizationInvitation(userId, organizationId, req.body)

        return res.status(201).json({
            message: 'Successfully created invitation!',
            invitation
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

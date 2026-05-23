import * as InvitationService from '../services/invitation.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'
import { AppError } from '../utils/appError.js'

export const getInvitationController = async (req: Request, res: Response) => {
    try {
       const session = req.authSession!
       const { organizationId } = session

       if (organizationId === null) {
        return res.status(400).json({ message: 'Organization id is required.'})
       }

       const invitations = await InvitationService.getInvitation(organizationId, req.query)

       return res.status(200).json({
        invitations
       })
    } catch (error) {
        return handleControllererror(res, error)
    }
}
// @desc    Create an invitation for the authenticated user's organization
// @route   POST /api/invitation
// @access  Private/Admin/Owner
export const createInvitationController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        const {organizationId, role, userId } = session
        const invitation = await InvitationService
                                .createOrganizationInvitation(userId, role, organizationId, req.body)

        return res.status(201).json({
            message: 'Successfully created invitation!',
            invitation
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const deleteOrganizationInvitesController = async (req: Request, res: Response) => {
    try {
        const invitationId = Number(req.params.id)
        const session = req.authSession!

        if (session.organizationId === null) {
            throw new AppError('Organization id is required.', 400)
        }

        await InvitationService.deleteInvitation({
            id: invitationId,
            organizationId: session.organizationId
        })

        return res.status(200).json({
            message: 'Successfully deleted invitation.'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

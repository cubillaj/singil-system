import * as DashboardServices from '../services/dashboard.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'

export const ownerDashboardController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.organizationId === null) return res.status(400).json({ message: 'Organization id required.'})

        const ownerDashboardData = await DashboardServices.ownerDashboard({
            organizationId: session.organizationId
        })

        return res.status(200).json({
            ownerDashboardData
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const adminDashboardController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        const { organizationId } = session

        if (organizationId === null) return res.status(400).json({ message: 'Organization id is required.'})

        const adminDashboardData = await DashboardServices.adminDashboard({
            organizationId
        })

        return res.status(200).json({ 
            adminDashboardData
        })
    } catch (error ) {
        return handleControllererror(res, error)
    }
}

export const memberDashboardController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.organizationId === null) return res.status(400).json({ message: 'Organization id is required'})

        const memberDashboardData = await DashboardServices.memberDashboard({ organizationId: session.organizationId})

        return res.status(200).json({
            memberDashboardData
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

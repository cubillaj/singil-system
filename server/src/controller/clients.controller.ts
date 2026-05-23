import * as  ClientsServices from '../services/clients.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'
export const createClientController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        const { organizationId} = session

        if(organizationId == null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const client = await ClientsServices.createClient({
            organizationId,
            ...req.body
        })

        return res.status(201).json({
            message: 'Successfully created a client!',
            client
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getAllClientsController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if (session.organizationId === null) {
            return res.status(400).json({ message: 'Organization Id is required'})
        }

        const allClients = await ClientsServices.getAllClients(session.organizationId, req.query)

        return res.status(200).json({
            ...allClients
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getSingleClientController = async (req: Request, res: Response) => {
    try {
        const clientId = req.params.clientId

        const session = req.authSession!

        if (session.organizationId == null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const client = await ClientsServices.getSingleClient({
            clientId,
            organizationId: session.organizationId
        })

        return res.status(200).json({
            client
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const updateClientController = async (req: Request, res: Response) => {
    try {
        const clientId = Number(req.params.clientId)

        const session = req.authSession!

        if (session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        const client = await ClientsServices.updateClient(clientId, session.organizationId, req.body)

        return res.status(200).json({
            message: 'Successfully update client.',
            client
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const deleteClientController = async (req: Request, res: Response) => {
    try {
        const clientId = Number(req.params.clientId)

        const session = req.authSession!

        if (session.organizationId === null) {
            return res.status(400).json({
                message: 'Organization id is required'
            })
        }

        await ClientsServices.deleteClient({clientId, organizationId: session.organizationId})

        return res.status(200).json({
            message: 'Succesfully deleted client.'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}
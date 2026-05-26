import * as UsersServices from '../services/user.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleController.js'
export const changePasswordController = async (req: Request, res: Response) => {
    try {
         const session = req.authSession!

         const {userId} = session
         if(userId === null) {
            return res.status(400).json({
                message: 'User id is required'
            })
         }

        await UsersServices.changePassword({
            userId,
            ...req.body
         })

         return res.status(200).json({
            message: 'Successfully change password.'
         })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const updateUserInfoController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.userId === null) return res.status(400).json({ message: 'User id is required'})

        const { userId} = session

        const user = await UsersServices.updateUser(userId, req.body)

        return res.status(200).json({
            message: 'Successfully updated your profile.',
            user
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const userInfoController = async (req: Request, res: Response) => {
    try {
        const session = req.authSession!

        if(session.userId === undefined) {
            return res.status(400).json({
                message: 'User id is required'
            })
        }

        const userID: number = Number(session.userId)

        const user = await UsersServices.userInfo(userID) 

        return res.status(200).json({
            user
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}
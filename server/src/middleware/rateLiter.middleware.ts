import { NextFunction, Request, Response } from "express";
import { RateLimiterRedis, RateLimiterRes} from "rate-limiter-flexible";
import { redisClient } from "../config/redis.js";

type RateLimiterOptions = {
    keyPrefix: string,
    points: number,
    duration: number,
    message: string,
    includeSessionUser?: boolean
}

const createRedisRateLimiter = ({ keyPrefix, points, duration, message, includeSessionUser = true}: RateLimiterOptions ) => {
    const limiter = new RateLimiterRedis({
        storeClient: redisClient,
        useRedisPackage: true,
        keyPrefix,
        points,
        duration
    })

    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
        const userId = req.authSession?.userId ?? req.session?.userId
        const key = includeSessionUser && userId ? `${ip}:${userId}` : ip

        try {
            await limiter.consume(key)
            next()
        } catch (error) {
            if(!(error instanceof RateLimiterRes)) {
                next(error)
                return
            }

            return res.status(429).json({
                message
            })
        }
    }
}

export const authRateLimiter = createRedisRateLimiter({
    keyPrefix: 'auth',
    points: 15,
    duration: 15 * 60,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    includeSessionUser: false
})

export const registerRateLimiter = createRedisRateLimiter({
    keyPrefix: 'auth_register',
    points: 5,
    duration: 60 * 60,
    message: 'Too many registration attempts. Please try again after 1 hour.',
    includeSessionUser: false
})

export const apiRateLimiter = createRedisRateLimiter({
    keyPrefix: 'api',
    points: 600,
    duration: 15 * 60,
    message: 'Too many requests. Please slow down and try again shortly.'
})

export const readRateLimiter = createRedisRateLimiter({
    keyPrefix: 'api_read',
    points: 900,
    duration: 15 * 60,
    message: 'Too many requests. Please slow down and try again shortly.'
})

export const writeRateLimiter = createRedisRateLimiter({
    keyPrefix: 'api_write',
    points: 180,
    duration: 15 * 60,
    message: 'Too many changes submitted. Please slow down and try again shortly.'
})

export const sensitiveActionRateLimiter = createRedisRateLimiter({
    keyPrefix: 'api_sensitive',
    points: 30,
    duration: 15 * 60,
    message: 'Too many sensitive requests. Please try again later.'
})

export const uploadRateLimiter = createRedisRateLimiter({
    keyPrefix: 'api_upload',
    points: 5,
    duration: 15 * 60,
    message: 'Too many upload requests. Please try again later.'
})

export const exportRateLimiter = createRedisRateLimiter({
    keyPrefix: 'export',
    points: 60,
    duration: 15 * 60,
    message: 'Too many export requests. Please try again later.'
})

export const webhookRateLimiter = createRedisRateLimiter({
    keyPrefix: 'webhook',
    points: 300,
    duration: 5 * 60,
    message: 'Too many webhook requests.'
})

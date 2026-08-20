import { NextFunction, Request, Response } from "express";
import { RateLimiterRedis, RateLimiterRes} from "rate-limiter-flexible";
import { createHash } from "node:crypto";
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
        const key = includeSessionUser && userId ? `user:${userId}` : `ip:${ip}`

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

const loginIpLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    useRedisPackage: true,
    keyPrefix: 'auth_ip',
    points: 100,
    duration: 15 * 60
})

const loginEmailLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    useRedisPackage: true,
    keyPrefix: 'auth_email',
    points: 10,
    duration: 15 * 60
})

const getIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown'

const getEmailKey = (email: string) => createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex')

const sendLoginRateLimitResponse = (res: Response, msBeforeNext: number) => {
    const retryAfter = Math.max(1, Math.ceil(msBeforeNext / 1000))
    const waitTime = retryAfter < 60
        ? `${retryAfter} second${retryAfter === 1 ? '' : 's'}`
        : `${Math.ceil(retryAfter / 60)} minute${Math.ceil(retryAfter / 60) === 1 ? '' : 's'}`

    res.setHeader('Retry-After', retryAfter.toString())
    return res.status(429).json({
        message: `Too many login attempts. Please try again in ${waitTime}.`
    })
}

export const authRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : null

    try {
        const [ipState, emailState] = await Promise.all([
            loginIpLimiter.get(getIp(req)),
            email ? loginEmailLimiter.get(getEmailKey(email)) : Promise.resolve(null)
        ])
        const blockedStates = [ipState, emailState].filter(
            (state): state is RateLimiterRes => state !== null && state.remainingPoints <= 0
        )

        if (blockedStates.length > 0) {
            return sendLoginRateLimitResponse(
                res,
                Math.max(...blockedStates.map((state) => state.msBeforeNext))
            )
        }

        next()
    } catch (error) {
        // Fail closed: authentication is unavailable if Redis cannot enforce limits.
        next(error)
    }
}

type LoginFailureResult = {
    blocked: boolean,
    retryAfterMs: number,
    delayMs: number
}

export const recordLoginFailure = async (req: Request, email: string): Promise<LoginFailureResult> => {
    let emailResult: RateLimiterRes

    try {
        emailResult = await loginEmailLimiter.consume(getEmailKey(email))
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            return { blocked: true, retryAfterMs: error.msBeforeNext, delayMs: 0 }
        }
        throw error
    }

    try {
        await loginIpLimiter.consume(getIp(req))
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            return { blocked: true, retryAfterMs: error.msBeforeNext, delayMs: 0 }
        }
        throw error
    }

    const failures = emailResult.consumedPoints
    const delayMs = failures < 5 ? 0 : Math.min(250 * (2 ** (failures - 5)), 2000)

    return { blocked: false, retryAfterMs: 0, delayMs }
}

export const clearLoginEmailFailures = async (email: string) => {
    await loginEmailLimiter.delete(getEmailKey(email))
}

export const respondToLoginRateLimit = (res: Response, retryAfterMs: number) => {
    return sendLoginRateLimitResponse(res, retryAfterMs)
}

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

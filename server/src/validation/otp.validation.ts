import z from "zod";

export const OtpSchema = z.object({
    otpHash: z.string( { error: 'Invalid hash'}).min(1, 'otp hash is required'),
    purpose: z.enum(['email_verification', 'password_reset']),
    ttlSeconds: z.number().int().positive().default(10 * 60)
})

export type Otp = z.infer<typeof OtpSchema>

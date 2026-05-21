import { redisClient } from "../config/redis.js";
import { AppError } from "../utils/appError.js";
import { OtpSchema } from "../validation/otp.validation.js";
import z from "zod";
const otpPrefix = "singil:otp:";
const defaultOtpTtlSeconds = 10 * 60;

export type OtpPurpose = "email_verification" | "password_reset";

export type StoredOtp = {
  userId: number;
  otpHash: string;
  purpose: OtpPurpose;
  createdAt: string;
};

const StoredOtpSchema = OtpSchema.omit({ ttlSeconds: true }).extend({
  userId: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});

function getOtpKey(userId: number, purpose: OtpPurpose) {
  return `${otpPrefix}${purpose}:${userId}`;
}

export async function saveOtp(
  userId: number,
  data: unknown
) {

  const parsed = OtpSchema.safeParse(data)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

    throw new AppError(msgVal, 400)
  }

  const { purpose, otpHash, ttlSeconds = defaultOtpTtlSeconds} = parsed.data


  const payload = {
    userId,
    purpose,
    otpHash,
    createdAt: new Date().toISOString(),
  };

  await redisClient.set(getOtpKey(userId, purpose), JSON.stringify(payload), {
    EX: ttlSeconds,
  });
}

export async function getOtp(userId: number, purpose: OtpPurpose) {
  const rawOtp = await redisClient.get(getOtpKey(userId, purpose));

  if (!rawOtp) {
    return null;
  }

  const parsed = StoredOtpSchema.safeParse(JSON.parse(rawOtp));

  if (!parsed.success) {
    throw new AppError("Invalid OTP data", 500);
  }

  return parsed.data;
}

export async function deleteOtp(userId: number, purpose: OtpPurpose) {
  await redisClient.del(getOtpKey(userId, purpose));
}

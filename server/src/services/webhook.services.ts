import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { organizations, organizationSubscriptions, subscriptionPayments } from "../db/schema.js";
import { AppError } from "../utils/appError.js";
import { subscriptionPrices } from "./paymongo.services.js";

type PayMongoWebhookInput = {
  rawBody: Buffer | string;
  signatureHeader: string | string[] | undefined;
};

type PayMongoSignatureParts = {
  timestamp?: string;
  testSignature?: string;
  liveSignature?: string;
};

const parseSignatureHeader = (signatureHeader: string) => {
  return signatureHeader.split(",").reduce<PayMongoSignatureParts>((parts, pair) => {
    const [key, value] = pair.split("=");

    if (key === "t") parts.timestamp = value;
    if (key === "te") parts.testSignature = value;
    if (key === "li") parts.liveSignature = value;

    return parts;
  }, {});
};

const safeCompare = (expected: string, received?: string) => {
  if (!received) return false;

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const verifyPayMongoSignature = (rawBody: string, signatureHeader: string | string[] | undefined) => {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError("PayMongo webhook secret is not configured.", 500);
  }

  const header = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!header) {
    throw new AppError("Missing PayMongo signature.", 400);
  }

  const { timestamp, testSignature, liveSignature } = parseSignatureHeader(header);

  if (!timestamp) {
    throw new AppError("Invalid PayMongo signature.", 400);
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  if (!safeCompare(expectedSignature, testSignature) && !safeCompare(expectedSignature, liveSignature)) {
    throw new AppError("Invalid PayMongo signature.", 400);
  }
};

const unixSecondsToDate = (value: unknown) => {
  if (typeof value !== "number") return new Date();
  return new Date(value * 1000);
};

const addOneMonth = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
};

const normalizeCurrency = (currency: unknown) => {
  return currency === "PHP" ? "PH" : currency;
};

export const handlePayMongoWebhook = async ({ rawBody, signatureHeader }: PayMongoWebhookInput) => {
  const rawBodyString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;

  verifyPayMongoSignature(rawBodyString, signatureHeader);

  const event = JSON.parse(rawBodyString);
  const eventType = event?.data?.attributes?.type;
  const resource = event?.data?.attributes?.data;

  if (eventType !== "checkout_session.payment.paid") {
    return {
      received: true,
      ignored: true,
      eventType,
    };
  }

  const checkoutSessionId = resource?.id;
  const checkoutAttributes = resource?.attributes;
  const payment = checkoutAttributes?.payments?.[0];
  const paymentId = payment?.id;
  const paymentAttributes = payment?.attributes;
  const plan = checkoutAttributes?.metadata?.plan;

  if (!checkoutSessionId || !plan || !(plan in subscriptionPrices)) {
    throw new AppError("Invalid PayMongo checkout metadata.", 400);
  }

  const expectedCentavos = Math.round(Number(subscriptionPrices[plan as keyof typeof subscriptionPrices]) * 100);
  const paidCentavos = Number(paymentAttributes?.amount ?? checkoutAttributes?.line_items?.[0]?.amount ?? 0);
  const paidCurrency = normalizeCurrency(paymentAttributes?.currency ?? checkoutAttributes?.line_items?.[0]?.currency);
  const paidAt = unixSecondsToDate(paymentAttributes?.paid_at ?? checkoutAttributes?.paid_at);

  const paymentRecord = await db.query.subscriptionPayments.findFirst({
    where: eq(subscriptionPayments.checkoutSessionId, checkoutSessionId),
    columns: {
      id: true,
      organizationId: true,
      subscriptionId: true,
      amount: true,
      currency: true,
      status: true,
    },
  });

  if (!paymentRecord) {
    throw new AppError("Subscription payment record is not found.", 404);
  }

  if (paymentRecord.status === "paid") {
    return {
      received: true,
      idempotent: true,
      paymentId: paymentRecord.id,
    };
  }

  if (paidCentavos !== expectedCentavos || paidCurrency !== paymentRecord.currency) {
    await db.update(subscriptionPayments)
      .set({
        providerPaymentId: paymentId,
        status: "amount_mismatch",
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, paymentRecord.id));

    throw new AppError("PayMongo payment amount does not match expected subscription price.", 400);
  }

  const currentPeriodStart = paidAt;
  const currentPeriodEnd = addOneMonth(currentPeriodStart);

  await db.transaction(async (tx) => {
    await tx.update(subscriptionPayments)
      .set({
        providerPaymentId: paymentId,
        status: "paid",
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, paymentRecord.id));

    if (paymentRecord.subscriptionId) {
      await tx.update(organizationSubscriptions)
        .set({
          plan: plan as keyof typeof subscriptionPrices,
          status: "active",
          provider: "paymongo",
          currentPeriodStart,
          currentPeriodEnd,
          expiresAt: currentPeriodEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(organizationSubscriptions.id, paymentRecord.subscriptionId));
    }

    await tx.update(organizations)
      .set({
        plan: plan as keyof typeof subscriptionPrices,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, paymentRecord.organizationId));
  });

  return {
    received: true,
    eventType,
    checkoutSessionId,
    paymentId,
    plan,
  };
};

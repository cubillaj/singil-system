import { and, eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { organizationSubscriptions, subscriptionPayments, users } from "../db/schema.js";
import { AppError } from "../utils/appError.js";
import { SubscriptionPaymentSchema } from "../validation/subscription.validation.js";
import { PAYMONGO_API, payMongoAuthHeaders } from "../utils/paymongo.utils.js";
import { getFirstZodMessage } from "../utils/zodErrors.js";

export const subscriptionPrices = {
  pro: "75.00",
  business: "150.00",
} as const;

const toPayMongoCurrency = (currency: string) => currency === "PH" ? "PHP" : currency;

export const subscriptionCheckout = async (data: unknown) => {
  const parsed = SubscriptionPaymentSchema.safeParse(data);

  if (!parsed.success) {
    throw new AppError(getFirstZodMessage(parsed.error), 400);
  }

  const {
    organizationId,
    currency,
    plan,
    userId
  } = parsed.data;

  const amount = subscriptionPrices[plan];

  const [user] = await db.select({
    id: users.id,
    name: users.name,
    lastName: users.lastName,
    email: users.email
  })
                         .from(users)
                         .where(and(
                          eq(users.id, userId),
                          eq(users.organizationId, organizationId)
                         ))

  if (!user) throw new AppError("User not found.", 404)

  const organizationSubscription = await db.query.organizationSubscriptions.findFirst({
    where: eq(organizationSubscriptions.organizationId, organizationId),
    columns: {
      id: true,
    },
    with: {
      organization: {
        columns: {
          name: true,
        }
      },
    },
  });

  if (!organizationSubscription) {
    throw new AppError("Organization subscription is not found.", 404);
  }

  const billingUser = {
    name: user.name,
    email: user.email,
    lastName: user.lastName
  }

  const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
  const centavosAmount = Math.round(Number(amount) * 100);
  const payMongoCurrency = toPayMongoCurrency(currency);

  const response = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: payMongoAuthHeaders(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: {
            name: billingUser ? `${billingUser.name} ${billingUser.lastName}`.trim() : organizationSubscription.organization.name,
            email: billingUser?.email,
          },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          line_items: [
            {
              name: `Singil ${plan} subscription`,
              description: `Subscription upgrade for ${organizationSubscription.organization.name}`,
              amount: centavosAmount,
              currency: payMongoCurrency,
              quantity: 1,
            },
          ],
          payment_method_types: [
            "card",
            "gcash",
            "paymaya",
          ],
          success_url: `${clientUrl}/payment/success`,
          cancel_url: `${clientUrl}/payment/cancel`,
          description: `Payment for ${organizationSubscription.organization.name} subscription`,
          metadata: {
            organizationId: String(organizationId),
            organizationSubscriptionId: String(organizationSubscription.id),
            plan,
          },
        },
      },
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    const message = responseData?.errors?.[0]?.detail ?? "Failed to create checkout";
    throw new AppError(message, 400);
  }

  const checkoutId = responseData.data?.id;
  const checkoutUrl = responseData.data?.attributes?.checkout_url;

  if (!checkoutId || !checkoutUrl) {
    throw new AppError("PayMongo checkout response is missing checkout data.", 400);
  }

  await db.insert(subscriptionPayments)
    .values({
      organizationId,
      subscriptionId: organizationSubscription.id,
      amount,
      currency,
      provider: "paymongo",
      checkoutSessionId: checkoutId,
      status: "pending",
    });

  return {
    checkoutId,
    checkoutUrl,
    raw: responseData.data,
  };
};

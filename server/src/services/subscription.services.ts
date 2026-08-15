import { and, eq, inArray, lte, ne } from "drizzle-orm";
import { db } from "../db/db.js";
import { organizations, organizationSubscriptions } from "../db/schema.js";
import { AppError } from "../utils/appError.js";

export type SubscriptionPlan = "free" | "pro" | "business";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";

export type EffectiveSubscription = {
  organizationId: number;
  storedPlan: SubscriptionPlan;
  effectivePlan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: Date | null;
};

export type PlanEntitlements = {
  maxClients: number | null;
  maxProducts: number | null;
  maxMembers: number | null;
  maxMonthlyInvoices: number | null;
  recurringInvoices: boolean;
  auditLogs: boolean;
};

export const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, PlanEntitlements> = {
  free: {
    maxClients: 3,
    maxProducts: 7,
    maxMembers: 3,
    maxMonthlyInvoices: 20,
    recurringInvoices: false,
    auditLogs: false,
  },
  pro: {
    maxClients: null,
    maxProducts: null,
    maxMembers: 10,
    maxMonthlyInvoices: null,
    recurringInvoices: true,
    auditLogs: false,
  },
  business: {
    maxClients: null,
    maxProducts: null,
    maxMembers: null,
    maxMonthlyInvoices: null,
    recurringInvoices: true,
    auditLogs: true,
  },
};

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

export const PLAN_CATALOG = {
  free: {
    id: "free",
    name: "Free",
    price: "0.00",
    currency: "PHP",
    description: "For solo testing and early setup.",
    features: ["3 clients and 7 products", "3 organization members", "20 invoices per month"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "75.00",
    currency: "PHP",
    description: "For active freelancers and small teams.",
    features: ["Unlimited clients and products", "Up to 10 organization members", "Unlimited and recurring invoices"],
  },
  business: {
    id: "business",
    name: "Business",
    price: "150.00",
    currency: "PHP",
    description: "For teams that need stronger controls.",
    features: ["Everything in Pro", "Unlimited organization members", "Organization audit logs"],
  },
} as const;

export const getPlanCatalog = () => Object.values(PLAN_CATALOG).map((plan) => ({
  ...plan,
  priceLabel: plan.id === "free" ? "PHP 0" : `PHP ${Number(plan.price)}`,
}));

const expireSubscriptions = async (organizationId?: number) => {
  const now = new Date();
  const filters = [
    lte(organizationSubscriptions.expiresAt, now),
    ne(organizationSubscriptions.plan, "free"),
  ];

  if (organizationId !== undefined) {
    filters.push(eq(organizationSubscriptions.organizationId, organizationId));
  }

  return db.transaction(async (tx) => {
    const expiredSubscriptions = await tx.update(organizationSubscriptions)
      .set({
        plan: "free",
        status: "expired",
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })
      .where(and(...filters))
      .returning({ organizationId: organizationSubscriptions.organizationId });

    const organizationIds = [...new Set(
      expiredSubscriptions.map((subscription) => subscription.organizationId)
    )];

    if (organizationIds.length > 0) {
      await tx.update(organizations)
        .set({
          plan: "free",
          updatedAt: now,
        })
        .where(inArray(organizations.id, organizationIds));
    }

    return organizationIds;
  });
};

export const expireOrganizationSubscription = async (organizationId: number) => {
  const expiredOrganizationIds = await expireSubscriptions(organizationId);
  return expiredOrganizationIds.length > 0;
};

export const expireDueSubscriptions = async () => expireSubscriptions();

export const cancelSubscriptionAtPeriodEnd = async (organizationId: number) => {
  await expireOrganizationSubscription(organizationId);

  const subscription = await db.query.organizationSubscriptions.findFirst({
    where: eq(organizationSubscriptions.organizationId, organizationId),
  });

  if (!subscription || subscription.plan === "free") {
    throw new AppError("There is no paid subscription to cancel.", 409);
  }

  if (subscription.status === "cancelled" && subscription.cancelAtPeriodEnd) {
    throw new AppError("Subscription cancellation is already scheduled.", 409);
  }

  if (subscription.status !== "active") {
    throw new AppError("Only an active subscription can be cancelled.", 409);
  }

  if (!subscription.expiresAt || subscription.expiresAt <= new Date()) {
    throw new AppError("The subscription does not have an active billing period.", 409);
  }

  const [cancelledSubscription] = await db.update(organizationSubscriptions)
    .set({
      status: "cancelled",
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(organizationSubscriptions.id, subscription.id),
      eq(organizationSubscriptions.status, "active")
    ))
    .returning();

  if (!cancelledSubscription) {
    throw new AppError("Subscription status changed before cancellation could be saved.", 409);
  }

  return cancelledSubscription;
};

export const resumeSubscription = async (organizationId: number) => {
  await expireOrganizationSubscription(organizationId);

  const subscription = await db.query.organizationSubscriptions.findFirst({
    where: eq(organizationSubscriptions.organizationId, organizationId),
  });

  if (!subscription || subscription.status !== "cancelled" || !subscription.cancelAtPeriodEnd) {
    throw new AppError("There is no scheduled cancellation to resume.", 409);
  }

  if (!subscription.expiresAt || subscription.expiresAt <= new Date()) {
    throw new AppError("The subscription billing period has already ended.", 409);
  }

  const [resumedSubscription] = await db.update(organizationSubscriptions)
    .set({
      status: "active",
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(organizationSubscriptions.id, subscription.id),
      eq(organizationSubscriptions.status, "cancelled"),
      eq(organizationSubscriptions.cancelAtPeriodEnd, true)
    ))
    .returning();

  if (!resumedSubscription) {
    throw new AppError("Subscription status changed before it could be resumed.", 409);
  }

  return resumedSubscription;
};

export const getEffectiveSubscription = async (
  organizationId: number
): Promise<EffectiveSubscription> => {
  await expireOrganizationSubscription(organizationId);

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: {
      id: true,
      plan: true,
    },
    with: {
      subscription: {
        columns: {
          plan: true,
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!organization) {
    throw new AppError("Organization is not found", 404);
  }

  const subscription = organization.subscription;

  if (!subscription) {
    return {
      organizationId: organization.id,
      storedPlan: organization.plan,
      effectivePlan: "free",
      status: "expired",
      expiresAt: null,
    };
  }

  const now = new Date();
  const hasCurrentPeriod = subscription.expiresAt === null || subscription.expiresAt > now;
  const hasPaidAccess = subscription.plan !== "free" && (
    (subscription.status === "active" && hasCurrentPeriod) ||
    (subscription.status === "cancelled" && subscription.expiresAt !== null && subscription.expiresAt > now)
  );

  return {
    organizationId: organization.id,
    storedPlan: subscription.plan,
    effectivePlan: hasPaidAccess ? subscription.plan : "free",
    status: subscription.status,
    expiresAt: subscription.expiresAt,
  };
};

export const getOrganizationEntitlements = async (organizationId: number) => {
  const subscription = await getEffectiveSubscription(organizationId);

  return {
    ...subscription,
    ...PLAN_ENTITLEMENTS[subscription.effectivePlan],
  };
};

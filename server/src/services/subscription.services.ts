import { and, eq, inArray, lte, ne } from "drizzle-orm";
import { db } from "../db/db.js";
import { organizations, organizationSubscriptions } from "../db/schema.js";

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

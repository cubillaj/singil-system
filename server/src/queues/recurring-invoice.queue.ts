import { Queue } from "bullmq";
import { redisConnection } from "./redisConnection.js";

export const recurringInvoiceQueue = new Queue("recurring-invoices", {
    connection: redisConnection
})

export const scheduleRecurringInvoiceJob = async () => {
    await recurringInvoiceQueue.upsertJobScheduler(
        "daily-recurring-invoices",
        {
            pattern: "0 0 * * *"
        },
        {
            name: "generate-due-recurring-invoices",
            data: {},
            opts: {
                attempts: 5, 
                backoff: {
                    type: "exponential",
                    delay: 5_000
                },
                removeOnComplete: 100,
                removeOnFail: 500
            }
        }
    )

    await recurringInvoiceQueue.upsertJobScheduler(
        "daily-subscription-expiration",
        {
            pattern: "5 0 * * *"
        },
        {
            name: "expire-due-subscriptions",
            data: {},
            opts: {
                attempts: 5,
                backoff: {
                    type: "exponential",
                    delay: 5_000
                },
                removeOnComplete: 100,
                removeOnFail: 500
            }
        }
    )
}

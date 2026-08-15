import { Queue } from "bullmq";
import { redisConnection } from "./redisConnection.js";

export const emailInvoiceQueue = new Queue("email-invoices", {
    connection: redisConnection
})

export const scheduleEmailJob = async () => {
    await emailInvoiceQueue.upsertJobScheduler(
        "daily-email-invoices",
        {
            pattern: "0 0 * * *"
        },
        {
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
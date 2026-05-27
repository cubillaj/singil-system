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
            data: {}
        }
    )
}
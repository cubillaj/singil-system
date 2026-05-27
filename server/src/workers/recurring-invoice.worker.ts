import "dotenv/config";
import { Worker } from "bullmq";
import { redisConnection } from "../queues/redisConnection.js";
import { generateDueRecurringInvoices } from "../services/recurring-invoices.services.js";

const worker = new Worker(
    "recurring-invoices",
    async (job) => {
        if(job.name === "generate-due-recurring-invoices") {
            const invoices = await generateDueRecurringInvoices()

            return {
                generated: invoices.length
            }
        }
    },
    {
        connection: redisConnection
    }
)

worker.on("completed", (job, result) => {
    console.log(`Recurring invoice job ${job.id} completed`, result);
});

worker.on("failed", (job, error) => {
    console.error(`Recurring invoice job ${job?.id} failed`, error);
});

console.log("Recurring invoice worker is running...");

import "dotenv/config";
import cors from "cors";
import express from "express";
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectRedis } from "./src/config/redis.js";
import { sessionMiddleware } from "./src/config/session.js";
import { errorMiddleware } from "./src/middleware/error.middleware.js";
import authRoutes from "./src/routes/auth.routes.js";
import invitationRoutes from './src/routes/invitation.routes.js'
import organizationRoutes from './src/routes/organization.routes.js'
import clientsRoutes from './src/routes/clients.routes.js'
import productRoutes from './src/routes/products.routes.js'
import invoicesRoutes from './src/routes/invoice.routes.js'
import exportRoutes from './src/routes/export.routes.js'
import usersRoutes from './src/routes/users.routes.js'
import recurringInvoicesRoutes from './src/routes/recurring-invoices.routes.js'
import { scheduleRecurringInvoiceJob } from "./src/queues/recurring-invoice.queue.js";
import subscriptionRoutes from './src/routes/subscription.routes.js'
import webhookRoutes from './src/routes/webhook.routes.js'
import paymentRoutes from './src/routes/payment.routes.js'
import dashboardRoutes from './src/routes/dashboard.routes.js'
import auditLogRoutes from './src/routes/audit-log.routes.js'
import { webhookRateLimiter } from './src/middleware/rateLiter.middleware.js'
const app = express();
app.set('trust proxy', 1)

const devOrigins = ['http://localhost:5173', 'http://localhost:5174']

app.use(helmet())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : devOrigins,
  credentials: true
}));
app.use("/api/webhooks", webhookRateLimiter, webhookRoutes)
app.use(express.json());
app.use(cookieParser())
app.use(sessionMiddleware)
app.use("/api/auth", authRoutes)
app.use("/api/users", usersRoutes)
app.use("/api/invitation", invitationRoutes)
app.use("/api/organization", organizationRoutes)
app.use("/api/clients", clientsRoutes)
app.use("/api/products", productRoutes)
app.use("/api/invoices", invoicesRoutes)
app.use("/api/recurring-invoices", recurringInvoicesRoutes)
app.use("/api/export-invoice", exportRoutes)
app.use("/api/subscription", subscriptionRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/audit-logs', auditLogRoutes)
app.use(errorMiddleware)

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

connectRedis()
  .then(() => {
    console.log('Redis connected');
    return scheduleRecurringInvoiceJob();
  })
  .catch((error) => {
    console.error('Redis startup failed:', error);
  });

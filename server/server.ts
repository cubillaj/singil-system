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
const app = express();

const devOrigins = ['http://localhost:5173', 'http://localhost:5174']

await connectRedis();

app.use(helmet())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : devOrigins,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())
app.use(sessionMiddleware)
app.use("/api/auth", authRoutes)
app.use("/api/invitation", invitationRoutes)
app.use("/api/organization", organizationRoutes)
app.use("/api/clients", clientsRoutes)
app.use("/api/products", productRoutes)
app.use("/api/invoices", invoicesRoutes)
app.use("/api/export-invoice", exportRoutes)

app.use(errorMiddleware)

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

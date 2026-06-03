import express from "express";
import { getAuditLogsController } from "../controller/audit-log.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { readRateLimiter } from "../middleware/rateLiter.middleware.js";

const router = express.Router();

router.get("/", readRateLimiter, requireRole(["owner"]), getAuditLogsController);

export default router;

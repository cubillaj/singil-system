import express from "express";
import { requireRole } from "../middleware/auth.middleware.js";
import { readRateLimiter, sensitiveActionRateLimiter, writeRateLimiter } from "../middleware/rateLiter.middleware.js";
import {
  createRecurringInvoiceController,
  deleteRecurringInvoiceController,
  generateRecurringInvoiceController,
  getRecurringInvoiceController,
  getRecurringInvoicesController,
  updateRecurringInvoiceController,
} from "../controller/recurring-invoices.controller.js";

const router = express.Router();

router.get("/", readRateLimiter, requireRole(["admin", "member", "owner"]), getRecurringInvoicesController);
router.post("/", writeRateLimiter, requireRole(["admin", "owner"]), createRecurringInvoiceController);
router.post("/:recurringInvoiceId/generate", sensitiveActionRateLimiter, requireRole(["admin", "owner"]), generateRecurringInvoiceController);
router.get("/:recurringInvoiceId", readRateLimiter, requireRole(["admin", "member", "owner"]), getRecurringInvoiceController);
router.put("/:recurringInvoiceId", writeRateLimiter, requireRole(["admin", "owner"]), updateRecurringInvoiceController);
router.delete("/:recurringInvoiceId", writeRateLimiter, requireRole(["admin", "owner"]), deleteRecurringInvoiceController);

export default router;

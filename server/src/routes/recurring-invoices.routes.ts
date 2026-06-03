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
import { auditLogMiddleware } from "../middleware/audit-log.middleware.js";

const router = express.Router();

router.get("/", readRateLimiter, requireRole(["admin", "member", "owner"]), getRecurringInvoicesController);
router.post("/", writeRateLimiter, requireRole(["admin", "owner"]), auditLogMiddleware({
  action: "recurring_invoice.create",
  entityType: "recurring_invoice",
  getMetadata: (req) => ({ clientId: req.body?.clientId, interval: req.body?.interval }),
}), createRecurringInvoiceController);
router.post("/:recurringInvoiceId/generate", sensitiveActionRateLimiter, requireRole(["admin", "owner"]), auditLogMiddleware({
  action: "recurring_invoice.generate",
  entityType: "recurring_invoice",
  entityIdParam: "recurringInvoiceId",
}), generateRecurringInvoiceController);
router.get("/:recurringInvoiceId", readRateLimiter, requireRole(["admin", "member", "owner"]), getRecurringInvoiceController);
router.put("/:recurringInvoiceId", writeRateLimiter, requireRole(["admin", "owner"]), auditLogMiddleware({
  action: "recurring_invoice.update",
  entityType: "recurring_invoice",
  entityIdParam: "recurringInvoiceId",
}), updateRecurringInvoiceController);
router.delete("/:recurringInvoiceId", writeRateLimiter, requireRole(["admin", "owner"]), auditLogMiddleware({
  action: "recurring_invoice.delete",
  entityType: "recurring_invoice",
  entityIdParam: "recurringInvoiceId",
}), deleteRecurringInvoiceController);

export default router;

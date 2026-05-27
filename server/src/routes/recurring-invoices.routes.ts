import express from "express";
import { requireRole } from "../middleware/auth.middleware.js";
import {
  createRecurringInvoiceController,
  deleteRecurringInvoiceController,
  generateRecurringInvoiceController,
  getRecurringInvoiceController,
  getRecurringInvoicesController,
  updateRecurringInvoiceController,
} from "../controller/recurring-invoices.controller.js";

const router = express.Router();

router.get("/", requireRole(["admin", "member", "owner"]), getRecurringInvoicesController);
router.post("/", requireRole(["admin", "owner"]), createRecurringInvoiceController);
router.post("/:recurringInvoiceId/generate", requireRole(["admin", "owner"]), generateRecurringInvoiceController);
router.get("/:recurringInvoiceId", requireRole(["admin", "member", "owner"]), getRecurringInvoiceController);
router.put("/:recurringInvoiceId", requireRole(["admin", "owner"]), updateRecurringInvoiceController);
router.delete("/:recurringInvoiceId", requireRole(["admin", "owner"]), deleteRecurringInvoiceController);

export default router;

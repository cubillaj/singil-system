import { Request, Response } from "express";
import * as RecurringInvoiceServices from "../services/recurring-invoices.services.js";
import { handleControllererror } from "../utils/handleController.js";

const getSessionOrganizationId = (req: Request, res: Response) => {
  const organizationId = req.authSession?.organizationId;

  if (typeof organizationId !== "number") {
    res.status(400).json({ message: "Organization id is required" });
    return null;
  }

  return organizationId;
};

export const createRecurringInvoiceController = async (req: Request, res: Response) => {
  try {
    const session = req.authSession!;

    if (typeof session.userId !== "number") {
      return res.status(400).json({ message: "User id is required" });
    }

    if (typeof session.organizationId !== "number") {
      return res.status(400).json({ message: "Organization id is required" });
    }

    const recurringInvoice = await RecurringInvoiceServices.createRecurringInvoice({
      userId: session.userId,
      organizationId: session.organizationId,
    }, req.body);

    return res.status(201).json({
      message: "Successfully created recurring invoice.",
      recurringInvoice,
    });
  } catch (error) {
    return handleControllererror(res, error);
  }
};

export const getRecurringInvoicesController = async (req: Request, res: Response) => {
  try {
    const organizationId = getSessionOrganizationId(req, res);
    if (organizationId === null) return;

    const recurringInvoices = await RecurringInvoiceServices.getRecurringInvoices(organizationId, req.query);

    return res.status(200).json({
      ...recurringInvoices,
    });
  } catch (error) {
    return handleControllererror(res, error);
  }
};

export const getRecurringInvoiceController = async (req: Request, res: Response) => {
  try {
    const recurringInvoiceId = Number(req.params.recurringInvoiceId);
    const organizationId = getSessionOrganizationId(req, res);

    if (!Number.isInteger(recurringInvoiceId) || recurringInvoiceId <= 0) {
      return res.status(400).json({ message: "Recurring invoice id is required" });
    }

    if (organizationId === null) return;

    const recurringInvoice = await RecurringInvoiceServices.getSingleRecurringInvoice({
      recurringInvoiceId,
      organizationId,
    });

    return res.status(200).json({
      recurringInvoice,
    });
  } catch (error) {
    return handleControllererror(res, error);
  }
};

export const updateRecurringInvoiceController = async (req: Request, res: Response) => {
  try {
    const recurringInvoiceId = Number(req.params.recurringInvoiceId);
    const organizationId = getSessionOrganizationId(req, res);

    if (!Number.isInteger(recurringInvoiceId) || recurringInvoiceId <= 0) {
      return res.status(400).json({ message: "Recurring invoice id is required" });
    }

    if (organizationId === null) return;

    const recurringInvoice = await RecurringInvoiceServices.updateRecurringInvoice(
      recurringInvoiceId,
      organizationId,
      req.body,
    );

    return res.status(200).json({
      message: "Successfully updated recurring invoice.",
      recurringInvoice,
    });
  } catch (error) {
    return handleControllererror(res, error);
  }
};

export const deleteRecurringInvoiceController = async (req: Request, res: Response) => {
  try {
    const recurringInvoiceId = Number(req.params.recurringInvoiceId);
    const organizationId = getSessionOrganizationId(req, res);

    if (!Number.isInteger(recurringInvoiceId) || recurringInvoiceId <= 0) {
      return res.status(400).json({ message: "Recurring invoice id is required" });
    }

    if (organizationId === null) return;

    await RecurringInvoiceServices.deleteRecurringInvoice({
      recurringInvoiceId,
      organizationId,
    });

    return res.status(200).json({
      message: "Successfully deleted recurring invoice.",
    });
  } catch (error) {
    return handleControllererror(res, error);
  }
};

export const generateRecurringInvoiceController = async (req: Request, res: Response) => {
  try {
    const recurringInvoiceId = Number(req.params.recurringInvoiceId);
    const session = req.authSession!;

    if (!Number.isInteger(recurringInvoiceId) || recurringInvoiceId <= 0) {
      return res.status(400).json({ message: "Recurring invoice id is required" });
    }

    if (typeof session.organizationId !== "number") {
      return res.status(400).json({ message: "Organization id is required" });
    }

    if (typeof session.userId !== "number") {
      return res.status(400).json({ message: "User id is required" });
    }

    const invoice = await RecurringInvoiceServices.generateInvoiceFromRecurring({
      recurringInvoiceId,
      organizationId: session.organizationId,
      createdById: session.userId,
    });

    return res.status(201).json({
      message: "Successfully generated invoice.",
      invoice,
    });
  } catch (error) {
    return handleControllererror(res, error);
  }
};

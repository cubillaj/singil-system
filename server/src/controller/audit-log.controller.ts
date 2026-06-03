import { Request, Response } from "express";
import * as AuditLogServices from "../services/audit-log.services.js";
import { handleControllererror } from "../utils/handleController.js";

export const getAuditLogsController = async (req: Request, res: Response) => {
  try {
    const session = req.authSession!;

    if (session.organizationId === null) {
      return res.status(400).json({
        message: "Organization id is required.",
      });
    }

    const auditLogs = await AuditLogServices.getAuditLogs(session.organizationId, req.query);

    return res.status(200).json({
      ...auditLogs,
    });
  } catch (error) {
    return handleControllererror(res, error);
  }
};

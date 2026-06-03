import { Request, RequestHandler } from "express";
import { createAuditLog } from "../services/audit-log.services.js";

type AuditLogMetadata = Record<string, unknown>;

type AuditLogOptions = {
  action: string;
  entityType: string;
  entityIdParam?: string;
  getMetadata?: (req: Request) => AuditLogMetadata;
};

const getPositiveParamId = (req: Request, paramName?: string) => {
  if (!paramName) return null;

  const id = Number(req.params[paramName]);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const auditLogMiddleware = (options: AuditLogOptions): RequestHandler => {
  return (req, res, next) => {
    const session = req.authSession;

    // Only authenticated organization actions can be tied to an audit trail.
    if (!session || session.organizationId === null) {
      next();
      return;
    }

    const organizationId = session.organizationId;
    const userId = session.userId;

    res.once("finish", () => {
      // Record only successful writes; failed attempts belong in error/security logs.
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      void createAuditLog({
        organizationId,
        userId,
        action: options.action,
        entityType: options.entityType,
        entityId: getPositiveParamId(req, options.entityIdParam),
        metadata: {
          actorRole: session.role,
          ...(options.getMetadata?.(req) ?? {}),
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? null,
      }).catch((error) => {
        console.error("Failed to create audit log", error);
      });
    });

    next();
  };
};

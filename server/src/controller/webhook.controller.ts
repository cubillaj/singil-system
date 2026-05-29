import { Request, Response } from "express";
import * as WebhookServices from "../services/webhook.services.js";
import { handleControllererror } from "../utils/handleController.js";

export const payMongoWebhookController = async (req: Request, res: Response) => {
  try {
    const result = await WebhookServices.handlePayMongoWebhook({
      rawBody: req.body,
      signatureHeader: req.headers["paymongo-signature"],
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllererror(res, error);
  }
};

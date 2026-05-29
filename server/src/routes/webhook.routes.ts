import express from "express";
import { payMongoWebhookController } from "../controller/webhook.controller.js";

const router = express.Router();

router.post("/paymongo", express.raw({ type: "application/json" }), payMongoWebhookController);

export default router;

import { Router } from "express";
import { login, logout, me, register } from "../controller/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authRateLimiter, readRateLimiter, registerRateLimiter, writeRateLimiter } from "../middleware/rateLiter.middleware.js";

const router = Router();

router.post("/register", registerRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/me", readRateLimiter, requireAuth, me);
router.post("/logout", writeRateLimiter, requireAuth, logout);

export default router;

// route.ts

import { Router } from "express";
import {
  registerController,
  loginController,
  logoutController,
} from "./controller";
import { authenticateToken } from "../../middleware/authMiddleware";
import { validate, registerSchema, loginSchema } from "./validation";
import { authLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  registerController
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  loginController
);

router.post("/logout", authenticateToken, logoutController);

export default router;

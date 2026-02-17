import rateLimit, { Options } from "express-rate-limit";

/**
 * Rate limiter for OTP send endpoints
 * Very strict: 5 requests per 15 minutes per IP
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
} as Options);

/**
 * Rate limiter for authentication endpoints
 * Moderate: 10 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
} as Options);

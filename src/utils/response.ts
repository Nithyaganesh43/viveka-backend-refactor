import { Response } from "express";

/**
 * Send a success response
 */
export const success = (
  res: Response,
  data: Record<string, unknown> = {},
  status = 200
) => {
  return res.status(status).json({ success: true, ...data });
};

/**
 * Send a created response (201)
 */
export const created = (
  res: Response,
  data: Record<string, unknown> = {}
) => {
  return success(res, data, 201);
};

/**
 * Send a bad request response with validation errors
 */
export const badRequest = (
  res: Response,
  errors: string | string[]
) => {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  return res.status(400).json({
    success: false,
    errors: errorArray,
  });
};

/**
 * Send an unauthorized response
 */
export const unauthorized = (
  res: Response,
  message = "Unauthorized"
) => {
  return res.status(401).json({
    success: false,
    message,
  });
};

/**
 * Send a forbidden response
 */
export const forbidden = (
  res: Response,
  message = "Forbidden"
) => {
  return res.status(403).json({
    success: false,
    message,
  });
};

/**
 * Send a not found response
 */
export const notFound = (
  res: Response,
  message = "Not found"
) => {
  return res.status(404).json({
    success: false,
    message,
  });
};

/**
 * Send a conflict response
 */
export const conflict = (
  res: Response,
  message = "Resource already exists"
) => {
  return res.status(409).json({
    success: false,
    message,
  });
};

/**
 * Send a server error response
 */
export const serverError = (
  res: Response,
  error?: unknown
) => {
  const message =
    error instanceof Error
      ? error.message
      : error || "Internal server error";

  return res.status(500).json({
    success: false,
    message,
  });
};

/**
 * Centralized response utilities for consistent API responses
 */

/**
 * Send a success response
 * @param {Response} res - Express response object
 * @param {Object} data - Data to include in response
 * @param {number} status - HTTP status code (default: 200)
 */
export const success = (res, data = {}, status = 200) => {
  return res.status(status).json({ success: true, ...data });
};

/**
 * Send a created response (201)
 * @param {Response} res - Express response object
 * @param {Object} data - Data to include in response
 */
export const created = (res, data = {}) => {
  return success(res, data, 201);
};

/**
 * Send a bad request response with validation errors
 * @param {Response} res - Express response object
 * @param {string|string[]} errors - Error message(s)
 */
export const badRequest = (res, errors) => {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  return res.status(400).json({ success: false, errors: errorArray });
};

/**
 * Send an unauthorized response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
export const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({ success: false, message });
};

/**
 * Send a forbidden response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
export const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({ success: false, message });
};

/**
 * Send a not found response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
export const notFound = (res, message = 'Not found') => {
  return res.status(404).json({ success: false, message });
};

/**
 * Send a conflict response (e.g., duplicate resource)
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
export const conflict = (res, message = 'Resource already exists') => {
  return res.status(409).json({ success: false, message });
};

/**
 * Send a server error response
 * @param {Response} res - Express response object
 * @param {Error|string} error - Error object or message
 */
export const serverError = (res, error) => {
  const message =
    error instanceof Error ? error.message : error || 'Internal server error';
  return res.status(500).json({ success: false, message });
};

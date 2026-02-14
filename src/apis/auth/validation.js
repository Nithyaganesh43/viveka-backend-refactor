import { z } from 'zod';
import { badRequest } from '../../utils/response.js';

// =============================================================================
// SHARED VALIDATORS
// =============================================================================

const phoneNumber = z
  .string()
  .trim()
  .regex(/^\d{10,}$/, 'Phone number must be at least 10 digits');

const otp = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'OTP must be exactly 4 digits');

const otpPurpose = z.enum(['register', 'login', 'generic'], {
  errorMap: () => ({
    message: 'Purpose must be one of: register, login, generic',
  }),
});

const trimmedString = (min = 1, fieldName = 'Field') =>
  z.string().trim().min(min, `${fieldName} must be at least ${min} characters`);

const optionalTrimmedString = (min = 1, fieldName = 'Field') =>
  z
    .string()
    .trim()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

const optionalGstin = z
  .string()
  .trim()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GSTIN format',
  )
  .optional()
  .or(z.literal(''));

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      const zodIssues = error?.issues || error?.errors;
      if (zodIssues && Array.isArray(zodIssues)) {
        const errors = zodIssues.map((err) => {
          const path = err.path?.join('.') || '';
          return path ? `${path}: ${err.message}` : err.message;
        });
        return badRequest(res, errors);
      }
      next(error);
    }
  };
};

// =============================================================================
// OTP SCHEMAS
// =============================================================================

export const sendOtpSchema = z.object({
  phoneNumber: phoneNumber,
  purpose: otpPurpose.optional().default('generic'),
});

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const registerSchema = z.object({
  phoneNumber: phoneNumber,
  otp: otp,
  ownerName: trimmedString(2, 'Owner name'),
  businessName: trimmedString(2, 'Business name'),
  deviceId: z.string().trim().optional(),
  shopName: optionalTrimmedString(1, 'Shop name'),
  location: optionalTrimmedString(1, 'Location'),
  city: optionalTrimmedString(1, 'City'),
  state: optionalTrimmedString(1, 'State'),
  gstin: optionalGstin,
  profileUrl: optionalUrl,
});

export const loginSchema = z.object({
  phoneNumber: phoneNumber,
  otp: otp,
  deviceId: z.string().trim().optional(),
});

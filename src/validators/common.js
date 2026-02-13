import { z } from 'zod';

// =============================================================================
// PRIMITIVE VALIDATORS
// =============================================================================

export const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId format');

export const phoneNumber = z
  .string()
  .trim()
  .regex(/^\d{10,}$/, 'Phone number must be at least 10 digits');

export const otp = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'OTP must be exactly 4 digits');

// =============================================================================
// NUMBER VALIDATORS
// =============================================================================

export const positiveNumber = z
  .number({ invalid_type_error: 'Must be a number' })
  .positive('Must be greater than 0');

export const nonNegativeNumber = z
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Cannot be negative');

export const positiveInt = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .positive('Must be greater than 0');

export const nonNegativeInt = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .min(0, 'Cannot be negative');

// =============================================================================
// ENUM VALIDATORS
// =============================================================================

export const unit = z.enum(['nos', 'kg', 'litre', 'meter', 'pcs'], {
  errorMap: () => ({
    message: 'Unit must be one of: nos, kg, litre, meter, pcs',
  }),
});

export const paymentMethod = z.enum(['cash', 'card', 'upi', 'bank', 'other'], {
  errorMap: () => ({
    message: 'Method must be one of: cash, card, upi, bank, other',
  }),
});

export const otpPurpose = z.enum(['register', 'login', 'generic'], {
  errorMap: () => ({
    message: 'Purpose must be one of: register, login, generic',
  }),
});

// =============================================================================
// STRING HELPERS
// =============================================================================

/**
 * @param {number} min - Minimum length after trimming
 * @param {string} fieldName - Field name for error message
 */
export const trimmedString = (min = 1, fieldName = 'Field') =>
  z.string().trim().min(min, `${fieldName} must be at least ${min} characters`);

/**
 * @param {number} min - Minimum length if provided
 * @param {string} fieldName - Field name for error message
 */
export const optionalTrimmedString = (min = 1, fieldName = 'Field') =>
  z
    .string()
    .trim()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .optional();

// =============================================================================
// FORMAT VALIDATORS (OPTIONAL FIELDS)
// =============================================================================

export const optionalEmail = z
  .string()
  .trim()
  .email('Invalid email format')
  .optional()
  .or(z.literal(''));

export const optionalUrl = z
  .string()
  .trim()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

export const optionalGstin = z
  .string()
  .trim()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GSTIN format',
  )
  .optional()
  .or(z.literal(''));

// =============================================================================
// DATE VALIDATORS
// =============================================================================

export const isoDateString = z
  .string()
  .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
  .or(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  );

export const optionalIsoDate = isoDateString.optional();

// =============================================================================
// ROUTE PARAM SCHEMAS
// =============================================================================

export const clientIdParam = z.object({
  clientId: objectId,
});

export const clientAndGroupIdParams = z.object({
  clientId: objectId,
  groupId: objectId,
});

export const clientAndItemIdParams = z.object({
  clientId: objectId,
  itemId: objectId,
});

export const clientAndDealerIdParams = z.object({
  clientId: objectId,
  dealerId: objectId,
});

export const clientAndCustomerIdParams = z.object({
  clientId: objectId,
  clientCustomerId: objectId,
});

export const clientAndPhoneParams = z.object({
  clientId: objectId,
  phone: phoneNumber,
});

export const orderIdParam = z.object({
  orderId: objectId,
});

export const invoiceIdParam = z.object({
  invoiceId: objectId,
});

export const cartIdParam = z.object({
  cartId: objectId,
});

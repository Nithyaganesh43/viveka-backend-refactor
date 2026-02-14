import { z } from 'zod';
import { badRequest } from '../../utils/response.js';

// =============================================================================
// SHARED VALIDATORS
// =============================================================================

const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId format');

const phoneNumber = z
  .string()
  .trim()
  .regex(/^\d{10,}$/, 'Phone number must be at least 10 digits');

const trimmedString = (min = 1, fieldName = 'Field') =>
  z.string().trim().min(min, `${fieldName} must be at least ${min} characters`);

const optionalTrimmedString = (min = 1, fieldName = 'Field') =>
  z
    .string()
    .trim()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .optional();

const positiveNumber = z
  .number({ invalid_type_error: 'Must be a number' })
  .positive('Must be greater than 0');

const nonNegativeNumber = z
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Cannot be negative');

const positiveInt = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .positive('Must be greater than 0');

const paymentMethod = z.enum(['cash', 'card', 'upi', 'bank', 'other'], {
  errorMap: () => ({
    message: 'Method must be one of: cash, card, upi, bank, other',
  }),
});

const optionalEmail = z
  .string()
  .trim()
  .email('Invalid email format')
  .optional()
  .or(z.literal(''));

const optionalUrl = z
  .string()
  .trim()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

const isoDateString = z
  .string()
  .datetime({ message: 'Invalid date format. Use ISO 8601 format' })
  .or(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  );

const optionalIsoDate = isoDateString.optional();

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

export const validateMultiple = (schemas) => {
  return async (req, res, next) => {
    try {
      const allErrors = [];
      for (const [source, schema] of Object.entries(schemas)) {
        try {
          const parsed = await schema.parseAsync(req[source]);
          req[source] = parsed;
        } catch (error) {
          const zodIssues = error?.issues || error?.errors;
          if (zodIssues && Array.isArray(zodIssues)) {
            const errors = zodIssues.map((err) => {
              const path = err.path?.join('.') || '';
              const prefix = source !== 'body' ? `${source}.` : '';
              return path ? `${prefix}${path}: ${err.message}` : err.message;
            });
            allErrors.push(...errors);
          } else {
            throw error;
          }
        }
      }
      if (allErrors.length > 0) {
        return badRequest(res, allErrors);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// DEALER CRUD SCHEMAS
// =============================================================================

export const createDealerSchema = z.object({
  clientId: objectId,
  name: trimmedString(2, 'Dealer name'),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  phoneNumber: phoneNumber.optional().or(z.literal('')),
  email: optionalEmail,
  address: z.string().trim().optional().or(z.literal('')),
  logoUrl: optionalUrl,
});

export const updateDealerSchema = z.object({
  name: z.string().trim().min(2, 'Dealer name must be at least 2 characters').optional(),
  contactPerson: z.string().trim().optional().or(z.literal('')),
  phoneNumber: phoneNumber.optional().or(z.literal('')),
  email: optionalEmail,
  address: z.string().trim().optional(),
  logoUrl: optionalUrl,
});

// =============================================================================
// DEALER ORDER SCHEMAS
// =============================================================================

const orderItemSchema = z.object({
  itemId: objectId,
  quantity: positiveInt,
});

export const createOrderSchema = z.object({
  clientId: objectId,
  dealerId: objectId,
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().trim().optional().or(z.literal('')),
  deliveryInstructions: z.string().trim().optional().or(z.literal('')),
  isUrgent: z.boolean().optional().default(false),
});

export const markDeliveredSchema = z.object({
  clientId: objectId,
  totalAmount: nonNegativeNumber.optional(),
  dueDate: optionalIsoDate,
  deliveredBy: z.string().trim().optional().or(z.literal('')),
  deliveryNote: z.string().trim().optional().or(z.literal('')),
});

export const updateOrderTotalSchema = z.object({
  clientId: objectId,
  totalAmount: nonNegativeNumber.optional(),
  dueDate: optionalIsoDate,
});

export const cancelOrderSchema = z.object({
  clientId: objectId,
});

// =============================================================================
// DEALER PAYMENT SCHEMAS
// =============================================================================

export const dealerPaymentSchema = z.object({
  clientId: objectId,
  dealerId: objectId,
  orderId: objectId.optional(),
  amount: positiveNumber,
  method: paymentMethod.optional().default('cash'),
  note: z.string().trim().optional().or(z.literal('')),
  proofUrl: optionalUrl,
});

// =============================================================================
// ROUTE PARAM SCHEMAS
// =============================================================================

export const clientIdParam = z.object({
  clientId: objectId,
});

export const clientAndDealerIdParams = z.object({
  clientId: objectId,
  dealerId: objectId,
});

export const orderIdParam = z.object({
  orderId: objectId,
});

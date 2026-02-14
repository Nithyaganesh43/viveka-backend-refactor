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

const nonNegativeInt = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .min(0, 'Cannot be negative');

const positiveInt = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .positive('Must be greater than 0');

const unit = z.enum(['nos', 'kg', 'litre', 'meter', 'pcs'], {
  errorMap: () => ({
    message: 'Unit must be one of: nos, kg, litre, meter, pcs',
  }),
});

const paymentMethod = z.enum(['cash', 'card', 'upi', 'bank', 'other'], {
  errorMap: () => ({
    message: 'Method must be one of: cash, card, upi, bank, other',
  }),
});

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
// ITEM SYNC SCHEMAS
// =============================================================================

const itemCreateSyncSchema = z.object({
  name: trimmedString(2, 'Item name'),
  price: nonNegativeNumber,
  stock: nonNegativeInt.optional().default(0),
  lowStockQuantity: nonNegativeInt.optional(),
  unit: unit.optional(),
  groupId: objectId.optional(),
  description: optionalTrimmedString(1, 'Description'),
});

const itemUpdateSyncSchema = z.object({
  _id: objectId,
  name: optionalTrimmedString(2, 'Item name'),
  price: nonNegativeNumber.optional(),
  stock: nonNegativeInt.optional(),
  lowStockQuantity: nonNegativeInt.optional(),
  unit: unit.optional(),
  groupId: objectId.nullable().optional(),
  description: z.string().trim().optional(),
});

// =============================================================================
// INVOICE SYNC SCHEMAS
// =============================================================================

const syncInvoiceProductSchema = z.object({
  productId: objectId.optional(),
  itemName: trimmedString(1, 'Item name'),
  itemGroup: z.string().trim().optional(),
  quantity: positiveInt,
  costPerUnit: nonNegativeNumber,
});

const invoiceCreateSyncSchema = z.object({
  products: z
    .array(syncInvoiceProductSchema)
    .min(1, 'At least one product is required'),
  clientCustomerId: objectId.optional(),
  clientCustomerPhone: phoneNumber.optional().or(z.literal('')),
  clientCustomerName: optionalTrimmedString(1, 'Customer name'),
  totalAmount: nonNegativeNumber.optional(),
  paidAmount: nonNegativeNumber.optional().default(0),
  notes: optionalTrimmedString(1, 'Notes'),
});

// =============================================================================
// PAYMENT SYNC SCHEMAS
// =============================================================================

const paymentCreateSyncSchema = z.object({
  invoiceId: objectId,
  amount: positiveNumber,
  method: paymentMethod.optional().default('cash'),
  note: optionalTrimmedString(1, 'Note'),
});

// =============================================================================
// MAIN SYNC SCHEMAS
// =============================================================================

export const readyToSyncSchema = z.object({
  clientId: objectId.optional(),
});

export const syncPayloadSchema = z.object({
  clientId: objectId.optional(),
  item: z
    .object({
      create: z.array(itemCreateSyncSchema).optional(),
      update: z.array(itemUpdateSyncSchema).optional(),
      delete: z.array(objectId).optional(),
    })
    .optional(),
  invoice: z
    .object({
      create: z.array(invoiceCreateSyncSchema).optional(),
    })
    .optional(),
  payment: z
    .object({
      create: z.array(paymentCreateSyncSchema).optional(),
    })
    .optional(),
});

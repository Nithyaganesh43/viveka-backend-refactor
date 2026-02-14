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

const optionalEmail = z
  .string()
  .trim()
  .email('Invalid email format')
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

const nonNegativeInt = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .min(0, 'Cannot be negative');

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
// ITEM GROUP SCHEMAS
// =============================================================================

export const createItemGroupSchema = z.object({
  clientId: objectId,
  name: trimmedString(2, 'Group name'),
  description: z.string().trim().optional().or(z.literal('')),
});

export const updateItemGroupSchema = z.object({
  name: optionalTrimmedString(2, 'Group name'),
  description: z.string().trim().optional(),
});

//=============================================================================
// ITEM SCHEMAS
// =============================================================================

export const createItemSchema = z.object({
  clientId: objectId,
  name: trimmedString(2, 'Item name'),
  price: nonNegativeNumber,
  stock: nonNegativeInt.optional().default(0),
  lowStockQuantity: nonNegativeInt.optional().default(5),
  unit: unit.optional().default('nos'),
  groupId: objectId.optional(),
  dealerIds: z.array(objectId).optional(),
  description: z.string().trim().optional().or(z.literal('')),
});

export const updateItemSchema = z.object({
  name: optionalTrimmedString(2, 'Item name'),
  price: nonNegativeNumber.optional(),
  stock: nonNegativeInt.optional(),
  lowStockQuantity: nonNegativeInt.optional(),
  unit: unit.optional(),
  groupId: objectId.nullable().optional(),
  dealerIds: z.array(objectId).optional(),
  description: z.string().trim().optional(),
});

export const getItemsQuerySchema = z.object({
  groupId: objectId.optional(),
});

// =============================================================================
// ROUTE PARAM SCHEMAS (from common)
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

export const clientAndCustomerIdParams = z.object({
  clientId: objectId,
  clientCustomerId: objectId,
});

export const clientAndPhoneParams = z.object({
  clientId: objectId,
  phone: phoneNumber,
});

export const cartIdParam = z.object({
  cartId: objectId,
});

export const invoiceIdParam = z.object({
  invoiceId: objectId,
});

// =============================================================================
// CLIENT CUSTOMER SCHEMAS
// =============================================================================

export const createCustomerSchema = z.object({
  clientId: objectId,
  phone: phoneNumber,
  name: optionalTrimmedString(2, 'Customer name'),
  address: z.string().trim().optional().or(z.literal('')),
  emailId: optionalEmail,
  gstNo: optionalGstin,
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name must be at least 2 characters').optional(),
  phone: phoneNumber.optional().or(z.literal('')),
  address: z.string().trim().optional(),
  emailId: optionalEmail,
  gstNo: z.string().trim().optional().or(z.literal('')),
});

// =============================================================================
// CART SCHEMAS
// =============================================================================

export const createCartSchema = z.object({
  clientId: objectId,
  clientCustomerId: objectId.optional(),
  clientCustomerPhone: phoneNumber.optional().or(z.literal('')),
});

export const addCartItemSchema = z.object({
  cartId: objectId,
  itemId: objectId,
  itemName: trimmedString(1, 'Item name'),
  unitPrice: positiveNumber,
  quantity: positiveInt,
});

export const removeCartItemSchema = z.object({
  cartId: objectId,
  cartItemId: objectId,
});

export const clearCartSchema = z.object({
  cartId: objectId,
});

// =============================================================================
// INVOICE SCHEMAS
// =============================================================================

const invoiceProductSchema = z.object({
  productId: objectId.optional(),
  itemName: trimmedString(1, 'Item name'),
  itemGroup: z.string().trim().optional(),
  quantity: positiveInt,
  costPerUnit: nonNegativeNumber,
});

export const generateInvoiceSchema = z.object({
  clientId: objectId,
  cartId: objectId,
  clientCustomerId: objectId.optional(),
  clientCustomerPhone: phoneNumber.optional().or(z.literal('')),
  clientCustomerName: z.string().trim().optional().or(z.literal('')),
  totalAmount: nonNegativeNumber.optional(),
  paidAmount: nonNegativeNumber.optional().default(0),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const generateInvoiceWithProductsSchema = z.object({
  clientId: objectId,
  products: z
    .array(invoiceProductSchema)
    .min(1, 'At least one product is required'),
  clientCustomerId: objectId.optional(),
  clientCustomerPhone: phoneNumber.optional().or(z.literal('')),
  clientCustomerName: z.string().trim().optional().or(z.literal('')),
  totalAmount: nonNegativeNumber.optional(),
  paidAmount: nonNegativeNumber.optional().default(0),
  notes: z.string().trim().optional().or(z.literal('')),
});

// =============================================================================
// PAYMENT SCHEMAS
// =============================================================================

export const paymentSchema = z.object({
  clientId: objectId,
  invoiceId: objectId,
  amount: positiveNumber,
  method: paymentMethod.optional().default('cash'),
  note: z.string().trim().optional().or(z.literal('')),
});

// =============================================================================
// INVOICE PARAM SCHEMAS
// =============================================================================

export const clientCustomerInvoicesParams = z.object({
  clientId: objectId,
  clientCustomerId: objectId,
});

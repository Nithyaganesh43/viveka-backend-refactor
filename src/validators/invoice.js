import { z } from 'zod';
import {
  objectId,
  phoneNumber,
  trimmedString,
  positiveNumber,
  nonNegativeNumber,
  positiveInt,
  paymentMethod,
} from './common.js';

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
// ROUTE PARAM SCHEMAS
// =============================================================================

export const clientCustomerInvoicesParams = z.object({
  clientId: objectId,
  clientCustomerId: objectId,
});

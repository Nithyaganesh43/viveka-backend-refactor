import { z } from 'zod';
import {
  objectId,
  phoneNumber,
  trimmedString,
  optionalTrimmedString,
  positiveNumber,
  nonNegativeNumber,
  nonNegativeInt,
  positiveInt,
  unit,
  paymentMethod,
} from './common.js';

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

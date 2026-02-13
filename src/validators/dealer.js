import { z } from 'zod';
import {
  objectId,
  phoneNumber,
  trimmedString,
  optionalTrimmedString,
  positiveNumber,
  nonNegativeNumber,
  positiveInt,
  paymentMethod,
  optionalEmail,
  optionalUrl,
  optionalIsoDate,
  clientIdParam,
  clientAndDealerIdParams,
  orderIdParam,
} from './common.js';

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

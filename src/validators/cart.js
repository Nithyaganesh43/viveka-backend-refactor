import { z } from 'zod';
import {
  objectId,
  phoneNumber,
  trimmedString,
  positiveNumber,
  positiveInt,
  cartIdParam,
} from './common.js';

// =============================================================================
// CART SCHEMAS
// =============================================================================

export { cartIdParam };

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

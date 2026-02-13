import { z } from 'zod';
import {
  objectId,
  trimmedString,
  optionalTrimmedString,
  nonNegativeNumber,
  nonNegativeInt,
  unit,
} from './common.js';

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

// =============================================================================
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

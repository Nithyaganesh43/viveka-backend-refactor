import { z } from 'zod';
import {
  objectId,
  phoneNumber,
  optionalTrimmedString,
  optionalEmail,
  optionalGstin,
} from './common.js';

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

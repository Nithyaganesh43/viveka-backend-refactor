import { z } from 'zod';
import {
  objectId,
  optionalTrimmedString,
  optionalUrl,
  optionalGstin,
} from './common.js';

// =============================================================================
// CLIENT SCHEMAS
// =============================================================================

export const updateClientSchema = z.object({
  ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters').optional(),
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters').optional(),
  shopName: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
  state: z.string().trim().optional().or(z.literal('')),
  gstin: optionalGstin,
  profileUrl: optionalUrl,
  clientSettings: z
    .object({
      customerFields: z
        .object({
          address: z.boolean().optional(),
          gstNo: z.boolean().optional(),
          emailId: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

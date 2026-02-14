import { z } from 'zod';
import { badRequest } from '../../utils/response.js';

// =============================================================================
// SHARED VALIDATORS
// =============================================================================

const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId format');

const optionalTrimmedString = (min = 1, fieldName = 'Field') =>
  z
    .string()
    .trim()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .url('Invalid URL format')
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
// CLIENT SCHEMAS
// =============================================================================

export const clientIdParam = z.object({
  clientId: objectId,
});

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

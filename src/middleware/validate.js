import { badRequest } from '../utils/response.js';

/**
 * Validation middleware factory using Zod schemas
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 *
 * @example
 * // Validate request body
 * router.post('/items', validate(createItemSchema), createItemController);
 *
 * // Validate route params
 * router.get('/items/:clientId', validate(clientIdParam, 'params'), getItemsController);
 *
 * // Validate query parameters
 * router.get('/items', validate(itemQuerySchema, 'query'), getItemsController);
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      // Parse and validate the data, stripping unknown fields
      const parsed = await schema.parseAsync(req[source]);

      // Replace the source with validated/sanitized data
      req[source] = parsed;

      next();
    } catch (error) {
      // Check for Zod validation errors (supports both v3 .errors and v4 .issues)
      const zodIssues = error?.issues || error?.errors;
      if (zodIssues && Array.isArray(zodIssues)) {
        // Format Zod errors into array of messages
        const errors = zodIssues.map((err) => {
          const path = err.path?.join('.') || '';
          return path ? `${path}: ${err.message}` : err.message;
        });

        return badRequest(res, errors);
      }

      // Unexpected error - pass to error handler
      next(error);
    }
  };
};

/**
 * Validate multiple sources in a single middleware
 *
 * @param {Object} schemas - Object mapping source names to Zod schemas
 * @returns {Function} Express middleware function
 *
 * @example
 * router.put('/items/:clientId/:itemId',
 *   validateMultiple({
 *     params: clientAndItemIdParams,
 *     body: updateItemSchema
 *   }),
 *   updateItemController
 * );
 */
export const validateMultiple = (schemas) => {
  return async (req, res, next) => {
    try {
      const allErrors = [];

      for (const [source, schema] of Object.entries(schemas)) {
        try {
          const parsed = await schema.parseAsync(req[source]);
          req[source] = parsed;
        } catch (error) {
          // Check for Zod validation errors (supports both v3 .errors and v4 .issues)
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

export default validate;

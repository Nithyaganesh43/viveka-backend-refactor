import { z } from 'zod';

// =============================================================================
// DASHBOARD QUERY VALIDATORS
// =============================================================================

/**
 * Validate query parameters for sales trends endpoint
 * - months: Number of months to return (1-24), defaults to 6
 */
export const salesTrendsQuerySchema = z.object({
  months: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 6))
    .pipe(
      z
        .number()
        .int('Months must be a whole number')
        .min(1, 'Months must be at least 1')
        .max(24, 'Months cannot exceed 24'),
    ),
});

/**
 * Validate query parameters for top items endpoint
 * - limit: Number of items to return (1-50), defaults to 5
 */
export const topItemsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5))
    .pipe(
      z
        .number()
        .int('Limit must be a whole number')
        .min(1, 'Limit must be at least 1')
        .max(50, 'Limit cannot exceed 50'),
    ),
});

/**
 * Validate query parameters for full dashboard endpoint
 * - months: Number of months for sales trends (1-24), defaults to 6
 * - limit: Number of top items to return (1-50), defaults to 5
 */
export const dashboardQuerySchema = z.object({
  months: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 6))
    .pipe(
      z
        .number()
        .int('Months must be a whole number')
        .min(1, 'Months must be at least 1')
        .max(24, 'Months cannot exceed 24'),
    ),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5))
    .pipe(
      z
        .number()
        .int('Limit must be a whole number')
        .min(1, 'Limit must be at least 1')
        .max(50, 'Limit cannot exceed 50'),
    ),
});

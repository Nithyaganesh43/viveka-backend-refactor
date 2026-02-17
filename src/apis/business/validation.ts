import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { badRequest } from '../../utils/response.js';

/* ================= SHARED ================= */

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId format');

const phoneNumber = z
  .string()
  .trim()
  .regex(/^\d{10,}$/, 'Phone number must be at least 10 digits');

const trimmedString = (min = 1, name = 'Field') =>
  z.string().trim().min(min, `${name} must be at least ${min} characters`);

const optionalTrimmedString = (min = 1, name = 'Field') =>
  z.string().trim().min(min, `${name} must be at least ${min} characters`).optional();

const optionalEmail = z.string().trim().email().optional().or(z.literal(''));

const optionalGstin = z
  .string()
  .trim()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN')
  .optional()
  .or(z.literal(''));

const positiveNumber = z.number().positive();
const nonNegativeNumber = z.number().min(0);
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().min(0);

const unit = z.enum(['nos', 'kg', 'litre', 'meter', 'pcs']);
const paymentMethod = z.enum(['cash', 'card', 'upi', 'bank', 'other']);

/* ================= MIDDLEWARE ================= */

export const validate =
  (schema: z.ZodTypeAny, source: 'body' | 'params' | 'query' = 'body') =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req[source] = await schema.parseAsync(req[source]);
      next();
    } catch (err: any) {
      if (err?.issues) {
        const errors = err.issues.map((e: any) =>
          e.path.length ? `${e.path.join('.')}: ${e.message}` : e.message
        );
        badRequest(res, errors);
        return;
      }
      next(err);
    }
  };

export const validateMultiple =
  (schemas: Record<string, z.ZodTypeAny>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: string[] = [];

    for (const [src, schema] of Object.entries(schemas)) {
      try {
        req[src] = await schema.parseAsync(req[src]);
      } catch (err: any) {
        err.issues?.forEach((e: any) => {
          const path = e.path.join('.');
          errors.push(path ? `${src}.${path}: ${e.message}` : e.message);
        });
      }
    }

    if (errors.length) {
      badRequest(res, errors);
      return;
    }
    next();
  };

/* ================= ITEM GROUP ================= */

export const createItemGroupSchema = z.object({
  clientId: objectId,
  name: trimmedString(2, 'Group name'),
  description: z.string().trim().optional().or(z.literal('')),
});

export type CreateItemGroupDTO = z.infer<typeof createItemGroupSchema>;

export const updateItemGroupSchema = z.object({
  name: optionalTrimmedString(2, 'Group name'),
  description: z.string().trim().optional(),
});

export type UpdateItemGroupDTO = z.infer<typeof updateItemGroupSchema>;

/* ================= ITEM ================= */

export const createItemSchema = z.object({
  clientId: objectId,
  name: trimmedString(2, 'Item name'),
  price: nonNegativeNumber,
  stock: nonNegativeInt.optional().default(0),
  lowStockQuantity: nonNegativeInt.optional().default(5),
  unit: unit.optional().default('nos'),
  groupId: objectId.optional(),
  description: z.string().trim().optional().or(z.literal('')),
});

export type CreateItemDTO = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  name: optionalTrimmedString(2, 'Item name'),
  price: nonNegativeNumber.optional(),
  stock: nonNegativeInt.optional(),
  lowStockQuantity: nonNegativeInt.optional(),
  unit: unit.optional(),
  groupId: objectId.nullable().optional(),
  description: z.string().trim().optional(),
});

export type UpdateItemDTO = z.infer<typeof updateItemSchema>;

export const getItemsQuerySchema = z.object({
  groupId: objectId.optional(),
});

export type GetItemsQueryDTO = z.infer<typeof getItemsQuerySchema>;

/* ================= ROUTE PARAM SCHEMAS ================= */

export const clientIdParam = z.object({
  clientId: objectId,
});

export const clientAndGroupIdParams = z.object({
  clientId: objectId,
  groupId: objectId,
});

export const clientAndItemIdParams = z.object({
  clientId: objectId,
  itemId: objectId,
});

export const clientAndCustomerIdParams = z.object({
  clientId: objectId,
  clientCustomerId: objectId,
});

export const clientAndPhoneParams = z.object({
  clientId: objectId,
  phone: phoneNumber,
});

export const cartIdParam = z.object({
  cartId: objectId,
});

export const invoiceIdParam = z.object({
  invoiceId: objectId,
});

export const clientCustomerInvoicesParams = z.object({
  clientId: objectId,
  clientCustomerId: objectId,
});

/* ================= CUSTOMER ================= */

export const createCustomerSchema = z.object({
  clientId: objectId,
  phone: phoneNumber,
  name: optionalTrimmedString(2, 'Customer name'),
  address: z.string().trim().optional().or(z.literal('')),
  emailId: optionalEmail,
  gstNo: optionalGstin,
});

export type CreateCustomerDTO = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name must be at least 2 characters').optional(),
  phone: phoneNumber.optional().or(z.literal('')),
  address: z.string().trim().optional(),
  emailId: optionalEmail,
  gstNo: z.string().trim().optional().or(z.literal('')),
});

export type UpdateCustomerDTO = z.infer<typeof updateCustomerSchema>;

/* ================= CART ================= */

export const createCartSchema = z.object({
  clientId: objectId,
  clientCustomerId: objectId.optional(),
  clientCustomerPhone: phoneNumber.optional().or(z.literal('')),
});

export type CreateCartDTO = z.infer<typeof createCartSchema>;

export const addCartItemSchema = z.object({
  cartId: objectId,
  itemId: objectId,
  itemName: trimmedString(1, 'Item name'),
  unitPrice: positiveNumber,
  quantity: positiveInt,
});

export type AddCartItemDTO = z.infer<typeof addCartItemSchema>;

export const removeCartItemSchema = z.object({
  cartId: objectId,
  cartItemId: objectId,
});

export type RemoveCartItemDTO = z.infer<typeof removeCartItemSchema>;

export const clearCartSchema = z.object({
  cartId: objectId,
});

export type ClearCartDTO = z.infer<typeof clearCartSchema>;

/* ================= INVOICE ================= */

const invoiceProductSchema = z.object({
  productId: objectId.optional(),
  itemName: trimmedString(1),
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

export type GenerateInvoiceDTO = z.infer<typeof generateInvoiceSchema>;

export const generateInvoiceWithProductsSchema = z.object({
  clientId: objectId,
  products: z.array(invoiceProductSchema).min(1),
  clientCustomerId: objectId.optional(),
  clientCustomerPhone: phoneNumber.optional().or(z.literal('')),
  clientCustomerName: z.string().trim().optional().or(z.literal('')),
  totalAmount: nonNegativeNumber.optional(),
  paidAmount: nonNegativeNumber.optional().default(0),
  notes: z.string().trim().optional().or(z.literal('')),
});

export type GenerateInvoiceWithProductsDTO =
  z.infer<typeof generateInvoiceWithProductsSchema>;

/* ================= PAYMENT ================= */

export const paymentSchema = z.object({
  clientId: objectId,
  invoiceId: objectId,
  amount: positiveNumber,
  method: paymentMethod.optional().default('cash'),
  note: z.string().trim().optional().or(z.literal('')),
});

export type PaymentDTO = z.infer<typeof paymentSchema>;

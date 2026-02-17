import { z, ZodSchema, ZodType } from "zod";
import { Request, Response, NextFunction } from "express";
import { badRequest } from "../../utils/response";
import { SendOtpRequest, VerifyOtpRequest, OtpPurpose } from "./dto";

// =============================================================================
// SHARED VALIDATORS
// =============================================================================

const phoneNumber = z
  .string()
  .trim()
  .regex(/^\d{10,}$/, "Phone number must be at least 10 digits");

const otpPurpose = z.enum(["register", "login", "generic"], {
  errorMap: () => ({
    message: "Purpose must be one of: register, login, generic",
  }),
}) as ZodType<OtpPurpose>;

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Generic validation middleware for Zod schemas
 * @param schema - Zod schema to validate against
 * @param source - Request property to validate (body or query)
 */
export const validate = <T>(
  schema: ZodSchema<T>,
  source: "body" | "query" = "body"
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error: any) {
      const zodIssues = error?.issues || error?.errors;
      if (zodIssues && Array.isArray(zodIssues)) {
        const errors = zodIssues.map((err: any) => {
          const path = err.path?.join(".") || "";
          return path ? `${path}: ${err.message}` : err.message;
        });
        return badRequest(res, errors);
      }
      next(error);
    }
  };
};

// =============================================================================
// OTP SCHEMAS
// =============================================================================

/**
 * Schema for sending OTP - matches SendOtpRequest DTO
 */
export const sendOtpSchema: ZodSchema<SendOtpRequest> = z.object({
  phoneNumber: phoneNumber,
  purpose: otpPurpose.optional().default("generic"),
});

/**
 * Schema for verifying OTP - matches VerifyOtpRequest DTO
 */
export const verifyOtpSchema: ZodSchema<VerifyOtpRequest> = z.object({
  phoneNumber: phoneNumber,
  otp: z.string().trim().min(4, "OTP must be at least 4 digits"),
  purpose: otpPurpose,
});

// =============================================================================
// TYPED VALIDATION OUTPUT
// =============================================================================

export type ValidatedSendOtpRequest = z.infer<typeof sendOtpSchema>;
export type ValidatedVerifyOtpRequest = z.infer<typeof verifyOtpSchema>;

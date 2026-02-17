import { z, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
import { badRequest } from "../../utils/response";
import { SendOtpRequest } from "./dto";

const phoneNumber = z
  .string()
  .trim()
  .regex(/^\d{10,}$/, "Phone number must be at least 10 digits");

const otpPurpose = z.enum(["register", "login"], {
  message: "Purpose must be one of: register, login",
});

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
        badRequest(res, errors);
        return;
      }
      next(error);
    }
  };
};

export const sendOtpSchema: ZodSchema<SendOtpRequest> = z.object({
  phoneNumber,
  purpose: otpPurpose,
});

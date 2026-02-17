import { Request, Response, NextFunction } from "express";
import { sendOTP } from "./service";
import { success, serverError } from "../../utils/response";
import { SendOtpRequest, SendOtpResponse } from "./dto";

/**
 * Controller for sending OTP to a phone number
 * @route POST /api/otp/send
 * @param req - Express request with typed body
 * @param res - Express response
 * @returns Response with SendOtpResponse data
 */
export const sendOTPController = async (
  req: Request<{}, SendOtpResponse, SendOtpRequest>,
  res: Response<SendOtpResponse | { success: false; message: string; error?: any }>,
  next: NextFunction
): Promise<Response> => {
  try {
    const { phoneNumber, purpose } = req.body;
    const result: SendOtpResponse = await sendOTP(phoneNumber, purpose);
    return success(res, result);
  } catch (error: any) {
    return serverError(res, error);
  }
};

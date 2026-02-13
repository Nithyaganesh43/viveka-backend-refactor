import { sendOTP } from '../../../services/mockOtpService.js';
import { success, serverError } from '../../../utils/response.js';

export const sendOTPController = async (req, res) => {
  try {
    const { phoneNumber, purpose } = req.body;
    const result = await sendOTP(phoneNumber, purpose);
    return success(res, result);
  } catch (error) {
    return serverError(res, error);
  }
};

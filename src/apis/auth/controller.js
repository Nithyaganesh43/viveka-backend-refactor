import {
  registerClient,
  loginClient,
  logoutClient,
} from './service.js';
import {
  created,
  success,
  badRequest,
  unauthorized,
  serverError,
} from '../../utils/response.js';

export const registerController = async (req, res) => {
  try {
    const {
      phoneNumber,
      otp,
      ownerName,
      businessName,
      deviceId,
      shopName,
      location,
      city,
      state,
      gstin,
      profileUrl,
    } = req.body;

    const result = await registerClient({
      phoneNumber,
      otp,
      ownerName,
      businessName,
      deviceId,
      shopName,
      location,
      city,
      state,
      gstin,
      profileUrl,
    });
    return created(res, result);
  } catch (error) {
    return badRequest(res, error.message);
  }
};

export const loginController = async (req, res) => {
  try {
    const { phoneNumber, otp, deviceId } = req.body;
    const result = await loginClient(phoneNumber, otp, deviceId);
    return success(res, result);
  } catch (error) {
    return unauthorized(res, error.message);
  }
};

export const logoutController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    const deviceSessionId = req.auth?.deviceSessionId;

    if (!deviceSessionId) {
      return badRequest(res, 'Device session ID is required');
    }

    const result = await logoutClient(clientId, deviceSessionId);
    return success(res, { ...result, deviceSessionId });
  } catch (error) {
    return serverError(res, error);
  }
};

import {
  registerClient,
  loginClient,
  logoutClient,
  getClientDetails,
} from '../../services/authService.js';

export const registerController = async (req, res) => {
  try {
    const { phoneNumber, password, ownerName, businessName } = req.body;

    if (!phoneNumber || !password || !ownerName || !businessName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const result = await registerClient(
      phoneNumber,
      password,
      ownerName,
      businessName
    );
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { phoneNumber, password, deviceId, deviceName } = req.body;

    if (!phoneNumber || !password || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, password, and device ID are required',
      });
    }

    const result = await loginClient(
      phoneNumber,
      password,
      deviceId,
      deviceName
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

export const logoutController = async (req, res) => {
  try {
    const { clientId, deviceSessionId } = req.body;

    if (!clientId || !deviceSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and device session ID are required',
      });
    }

    const result = await logoutClient(clientId, deviceSessionId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getClientController = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await getClientDetails(clientId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

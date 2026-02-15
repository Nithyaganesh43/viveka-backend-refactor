import jwt from 'jsonwebtoken';
import repository from '../../repository/repository.js';
import { verifyOTP } from '../otp/service.js';
import { defaultCustomerFieldSettings } from '../client/service.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Register client using OTP verification
export const registerClient = async ({
  phoneNumber,
  otp,
  ownerName,
  businessName,
  deviceId = 'registration-device',
  shopName = '',
  location = '',
  city = '',
  state = '',
  gstin = '',
  profileUrl,
}) => {
  try {
    const existingClient = await repository.findOne('clients', { phoneNumber });
    if (existingClient) {
      throw new Error('Phone number already registered');
    }

    await verifyOTP(phoneNumber, otp, 'register');

    const clientData = {
      phoneNumber,
      ownerName,
      businessName,
      shopName,
      location,
      city,
      state,
      gstin,
      isActive: true,
      clientSettings: {
        customerFields: { ...defaultCustomerFieldSettings },
      },
    };

    if (profileUrl !== undefined) {
      clientData.profileUrl = profileUrl;
    }

    const newClient = await repository.create('clients', clientData);

    // Create an initial active device session and JWT
    const activeSession = await repository.updateOne(
      'devicesessions',
      { clientId: newClient._id, deviceId },
      {
        clientId: newClient._id,
        deviceId,
        isActive: true,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Deactivate any other sessions just in case
    await repository.updateMany(
      'devicesessions',
      { clientId: newClient._id, _id: { $ne: activeSession._id } },
      { isActive: false },
    );

    const token = jwt.sign(
      {
        clientId: newClient._id,
        phoneNumber: newClient.phoneNumber,
        deviceSessionId: activeSession._id,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    return {
      success: true,
      message: 'Client registered successfully',
      clientId: newClient._id,
      phoneNumber: newClient.phoneNumber,
      ownerName: newClient.ownerName,
      businessName: newClient.businessName,
      token,
      deviceSessionId: activeSession._id,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Login client via OTP and enforce single-device policy
export const loginClient = async (
  phoneNumber,
  otp,
  deviceId = 'default-device',
) => {
  try {
    const client = await repository.findOne('clients', { phoneNumber });
    if (!client) {
      throw new Error('Client not found');
    }

    if (client.isActive === false) {
      throw new Error('Account is not active');
    }

    await verifyOTP(phoneNumber, otp, 'login');

    // Upsert device session for this device
    const activeSession = await repository.updateOne(
      'devicesessions',
      { clientId: client._id, deviceId },
      {
        clientId: client._id,
        deviceId,
        isActive: true,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Deactivate other sessions (single-device policy)
    await repository.updateMany(
      'devicesessions',
      { clientId: client._id, _id: { $ne: activeSession._id } },
      { isActive: false },
    );

    const token = jwt.sign(
      {
        clientId: client._id,
        phoneNumber: client.phoneNumber,
        deviceSessionId: activeSession._id,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    client.lastLoginAt = new Date();
    await client.save();

    return {
      success: true,
      message: 'OTP login successful',
      clientId: client._id,
      token,
      deviceSessionId: activeSession._id,
      phoneNumber: client.phoneNumber,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Logout client
export const logoutClient = async (clientId, deviceSessionId) => {
  try {
    const session = await repository.updateOne(
      'devicesessions',
      { _id: deviceSessionId, clientId, isActive: true },
      { isActive: false },
      { new: true },
    );

    if (!session) {
      throw new Error('Active session not found or already logged out');
    }

    return {
      success: true,
      message: 'Logout successful',
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Client, DeviceSession } from '../models/Model.js';

// Hash password
export const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
};

// Compare password
export const comparePassword = async (password, passwordHash) => {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

// Register client with phone and password
export const registerClient = async (
  phoneNumber,
  password,
  ownerName,
  businessName
) => {
  try {
    // Check if client already exists
    const existingClient = await Client.findOne({ phoneNumber });
    if (existingClient) {
      throw new Error('Client with this phone number already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new client
    const newClient = await Client.create({
      phoneNumber,
      passwordHash,
      ownerName,
      businessName,
      isActive: true,
    });

    return {
      success: true,
      message: 'Client registered successfully',
      clientId: newClient._id,
      phoneNumber: newClient.phoneNumber,
    };
  } catch (error) {
    throw new Error(`Client registration failed: ${error.message}`);
  }
};

// Login client and create device session
export const loginClient = async (
  phoneNumber,
  password,
  deviceId,
  deviceName
) => {
  try {
    // Find client
    const client = await Client.findOne({ phoneNumber });
    if (!client) {
      throw new Error('Client not found');
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      password,
      client.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Deactivate previous device sessions (one-device policy)
    await DeviceSession.updateMany(
      { clientId: client._id, isActive: true },
      { isActive: false }
    );

    // Create new device session
    const newDeviceSession = await DeviceSession.create({
      clientId: client._id,
      deviceId,
      deviceName,
      isActive: true,
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        clientId: client._id,
        phoneNumber: client.phoneNumber,
        deviceSessionId: newDeviceSession._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Update last login
    client.lastLoginAt = new Date();
    await client.save();

    return {
      success: true,
      message: 'Login successful',
      clientId: client._id,
      token,
      deviceSessionId: newDeviceSession._id,
    };
  } catch (error) {
    throw new Error(`Client login failed: ${error.message}`);
  }
};

// Logout client
export const logoutClient = async (clientId, deviceSessionId) => {
  try {
    await DeviceSession.findByIdAndUpdate(deviceSessionId, { isActive: false });
    return {
      success: true,
      message: 'Logout successful',
    };
  } catch (error) {
    throw new Error(`Logout failed: ${error.message}`);
  }
};

// Get client details
export const getClientDetails = async (clientId) => {
  try {
    const client = await Client.findById(clientId).select('-passwordHash');
    if (!client) {
      throw new Error('Client not found');
    }
    return {
      success: true,
      client,
    };
  } catch (error) {
    throw new Error(`Failed to get client details: ${error.message}`);
  }
};

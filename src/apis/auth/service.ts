// service.ts

import jwt from "jsonwebtoken";
import repository from "../../repository/repository";
import { verifyOTP } from "../otp/service";
import { defaultCustomerFieldSettings } from "../client/service";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

interface RegisterParams {
  phoneNumber: string;
  otp: string;
  ownerName: string;
  businessName: string;
  deviceId?: string;
  shopName?: string;
  location?: string;
  city?: string;
  state?: string;
  gstin?: string;
  profileUrl?: string;
}

export const registerClient = async ({
  phoneNumber,
  otp,
  ownerName,
  businessName,
  deviceId = "registration-device",
  shopName = "",
  location = "",
  city = "",
  state = "",
  gstin = "",
  profileUrl,
}: RegisterParams) => {
  const existingClient = await repository.findOne("clients", { phoneNumber });
  if (existingClient) {
    throw new Error("Phone number already registered");
  }

  await verifyOTP(phoneNumber, otp, "register");

  const clientData: any = {
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

  if (profileUrl !== undefined) clientData.profileUrl = profileUrl;

  const newClient: any = await repository.create("clients", clientData);

  const activeSession: any = await repository.updateOne(
    "devicesessions",
    { clientId: newClient._id, deviceId },
    {
      clientId: newClient._id,
      deviceId,
      isActive: true,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await repository.updateMany(
    "devicesessions",
    { clientId: newClient._id, _id: { $ne: activeSession._id } },
    { isActive: false }
  );

  const token = jwt.sign(
    {
      clientId: newClient._id,
      phoneNumber: newClient.phoneNumber,
      deviceSessionId: activeSession._id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    success: true,
    message: "Client registered successfully",
    clientId: newClient._id,
    phoneNumber: newClient.phoneNumber,
    ownerName: newClient.ownerName,
    businessName: newClient.businessName,
    token,
    deviceSessionId: activeSession._id,
  };
};

export const loginClient = async (
  phoneNumber: string,
  otp: string,
  deviceId = "default-device"
) => {
  const client: any = await repository.findOne("clients", { phoneNumber });
  if (!client) throw new Error("Client not found");
  if (client.isActive === false) throw new Error("Account is not active");

  await verifyOTP(phoneNumber, otp, "login");

  const activeSession: any = await repository.updateOne(
    "devicesessions",
    { clientId: client._id, deviceId },
    {
      clientId: client._id,
      deviceId,
      isActive: true,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await repository.updateMany(
    "devicesessions",
    { clientId: client._id, _id: { $ne: activeSession._id } },
    { isActive: false }
  );

  const token = jwt.sign(
    {
      clientId: client._id,
      phoneNumber: client.phoneNumber,
      deviceSessionId: activeSession._id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  client.lastLoginAt = new Date();
  await client.save();

  return {
    success: true,
    message: "OTP login successful",
    clientId: client._id,
    token,
    deviceSessionId: activeSession._id,
    phoneNumber: client.phoneNumber,
  };
};

export const logoutClient = async (
  clientId: string,
  deviceSessionId: string
) => {
  const session = await repository.updateOne(
    "devicesessions",
    { _id: deviceSessionId, clientId, isActive: true },
    { isActive: false },
    { new: true }
  );

  if (!session) {
    throw new Error("Active session not found or already logged out");
  }

  return {
    success: true,
    message: "Logout successful",
  };
};

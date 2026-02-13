import { z } from 'zod';
import {
  phoneNumber,
  otp,
  otpPurpose,
  trimmedString,
  optionalTrimmedString,
  optionalUrl,
  optionalGstin,
} from './common.js';

// =============================================================================
// OTP SCHEMAS
// =============================================================================

export const sendOtpSchema = z.object({
  phoneNumber: phoneNumber,
  purpose: otpPurpose.optional().default('generic'),
});

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const registerSchema = z.object({
  phoneNumber: phoneNumber,
  otp: otp,
  ownerName: trimmedString(2, 'Owner name'),
  businessName: trimmedString(2, 'Business name'),
  deviceId: z.string().trim().optional(),
  shopName: optionalTrimmedString(1, 'Shop name'),
  location: optionalTrimmedString(1, 'Location'),
  city: optionalTrimmedString(1, 'City'),
  state: optionalTrimmedString(1, 'State'),
  gstin: optionalGstin,
  profileUrl: optionalUrl,
});

export const loginSchema = z.object({
  phoneNumber: phoneNumber,
  otp: otp,
  deviceId: z.string().trim().optional(),
});

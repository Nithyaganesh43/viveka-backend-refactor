/**
 * OTP API DTOs - Type contracts for requests and responses
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type OtpPurpose = "register" | "login" | "generic";

// =============================================================================
// REQUEST TYPES
// =============================================================================

// Send OTP Request
export interface SendOtpRequest {
  phoneNumber: string;
  purpose?: OtpPurpose;
}

// Verify OTP Request
export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
  purpose: OtpPurpose;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

// Send OTP Response
export interface SendOtpResponse {
  success: boolean;
  message: string;
  phoneNumber: string;
  expiresInSeconds: number;
}

// Verify OTP Response
export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  phoneNumber: string;
}

// =============================================================================
// SERVICE INPUT TYPES
// =============================================================================

export interface SendOtpInput {
  phoneNumber: string;
  purpose?: string;
}

export interface VerifyOtpInput {
  phoneNumber: string;
  otp: string;
  purpose: string;
  consume?: boolean;
}

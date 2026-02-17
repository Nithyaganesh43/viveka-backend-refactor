// dto.ts

export interface RegisterRequest {
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

export interface LoginRequest {
  phoneNumber: string;
  otp: string;
  deviceId?: string;
}

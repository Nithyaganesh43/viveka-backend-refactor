/**
 * DTO interfaces for Client API contracts.
 * Only type definitions - no runtime logic.
 */

// =============================================================================
// REQUEST TYPES
// =============================================================================

export interface ClientIdParams {
  clientId: string;
}

export interface CustomerFieldSettings {
  address?: boolean;
  gstNo?: boolean;
  emailId?: boolean;
}

export interface ClientSettings {
  customerFields?: CustomerFieldSettings;
}

export interface UpdateClientRequest {
  ownerName?: string;
  businessName?: string;
  shopName?: string;
  location?: string;
  city?: string;
  state?: string;
  gstin?: string;
  profileUrl?: string;
  clientSettings?: ClientSettings;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ClientData {
  _id: string;
  phoneNumber: string;
  ownerName?: string;
  businessName?: string;
  shopName?: string;
  location?: string;
  city?: string;
  state?: string;
  gstin?: string;
  profileUrl?: string;
  clientSettings: ClientSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetClientResponse {
  success: boolean;
  client: ClientData;
}

export interface UpdateClientResponse {
  success: boolean;
  client: ClientData;
}

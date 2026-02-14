/**
 * JS-only DTO placeholders for API contracts.
 * (No runtime logic; types are expressed via JSDoc typedefs.)
 */

/**
 * @typedef {Object} RegisterRequest
 * @property {string} phoneNumber
 * @property {string} otp
 * @property {string} ownerName
 * @property {string} businessName
 * @property {string} [deviceId]
 * @property {string} [shopName]
 * @property {string} [location]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [gstin]
 * @property {string} [profileUrl]
 */

/**
 * @typedef {Object} LoginRequest
 * @property {string} phoneNumber
 * @property {string} otp
 * @property {string} [deviceId]
 */

export {};

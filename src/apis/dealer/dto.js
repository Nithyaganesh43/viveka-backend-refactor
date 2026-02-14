/**
 * JS-only DTO placeholders for API contracts.
 * (No runtime logic; types are expressed via JSDoc typedefs.)
 */

/**
 * @typedef {Object} CreateDealerRequest
 * @property {string} clientId
 * @property {string} name
 * @property {string} [contactPerson]
 * @property {string} [phoneNumber]
 * @property {string} [email]
 * @property {string} [address]
 * @property {string} [logoUrl]
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} itemId
 * @property {number} quantity
 */

/**
 * @typedef {Object} CreateOrderRequest
 * @property {string} clientId
 * @property {string} dealerId
 * @property {OrderItem[]} items
 * @property {string} [notes]
 * @property {string} [deliveryInstructions]
 * @property {boolean} [isUrgent]
 */

/**
 * @typedef {Object} DealerPaymentRequest
 * @property {string} clientId
 * @property {string} dealerId
 * @property {string} [orderId]
 * @property {number} amount
 * @property {string} [method]
 * @property {string} [note]
 * @property {string} [proofUrl]
 */

export {};

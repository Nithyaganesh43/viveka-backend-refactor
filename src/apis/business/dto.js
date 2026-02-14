/**
 * JS-only DTO placeholders for API contracts.
 * (No runtime logic; types are expressed via JSDoc typedefs.)
 */

/**
 * @typedef {Object} CreateItemGroupRequest
 * @property {string} clientId
 * @property {string} name
 * @property {string} [description]
 */

/**
 * @typedef {Object} CreateItemRequest
 * @property {string} clientId
 * @property {string} name
 * @property {number} price
 * @property {number} [stock]
 * @property {number} [lowStockQuantity]
 * @property {string} [unit]
 * @property {string} [groupId]
 * @property {string} [description]
 */

/**
 * @typedef {Object} CreateCustomerRequest
 * @property {string} clientId
 * @property {string} phone
 * @property {string} [name]
 * @property {string} [address]
 * @property {string} [emailId]
 * @property {string} [gstNo]
 */

/**
 * @typedef {Object} CreateCartRequest
 * @property {string} clientId
 * @property {string} [clientCustomerId]
 * @property {string} [clientCustomerPhone]
 */

/**
 * @typedef {Object} AddCartItemRequest
 * @property {string} cartId
 * @property {string} itemId
 * @property {string} itemName
 * @property {number} unitPrice
 * @property {number} quantity
 */

/**
 * @typedef {Object} GenerateInvoiceRequest
 * @property {string} clientId
 * @property {string} cartId
 * @property {string} [clientCustomerId]
 * @property {string} [clientCustomerPhone]
 * @property {string} [clientCustomerName]
 * @property {number} [totalAmount]
 * @property {number} [paidAmount]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} InvoiceProduct
 * @property {string} [productId]
 * @property {string} itemName
 * @property {string} [itemGroup]
 * @property {number} quantity
 * @property {number} costPerUnit
 */

/**
 * @typedef {Object} GenerateInvoiceWithProductsRequest
 * @property {string} clientId
 * @property {InvoiceProduct[]} products
 * @property {string} [clientCustomerId]
 * @property {string} [clientCustomerPhone]
 * @property {string} [clientCustomerName]
 * @property {number} [totalAmount]
 * @property {number} [paidAmount]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} RecordPaymentRequest
 * @property {string} clientId
 * @property {string} invoiceId
 * @property {number} amount
 * @property {string} [method]
 * @property {string} [note]
 */

export {};

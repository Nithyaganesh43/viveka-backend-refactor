/**
 * JS-only DTO placeholders for API contracts.
 * (No runtime logic; types are expressed via JSDoc typedefs.)
 */

/**
 * @typedef {Object} ItemCreateSync
 * @property {string} name
 * @property {number} price
 * @property {number} [stock]
 * @property {number} [lowStockQuantity]
 * @property {string} [unit]
 * @property {string} [groupId]
 * @property {string} [description]
 */

/**
 * @typedef {Object} ItemUpdateSync
 * @property {string} _id
 * @property {string} [name]
 * @property {number} [price]
 * @property {number} [stock]
 * @property {number} [lowStockQuantity]
 * @property {string} [unit]
 * @property {string} [groupId]
 * @property {string} [description]
 */

/**
 * @typedef {Object} InvoiceProductSync
 * @property {string} [productId]
 * @property {string} itemName
 * @property {string} [itemGroup]
 * @property {number} quantity
 * @property {number} costPerUnit
 */

/**
 * @typedef {Object} InvoiceCreateSync
 * @property {InvoiceProductSync[]} products
 * @property {string} [clientCustomerId]
 * @property {string} [clientCustomerPhone]
 * @property {string} [clientCustomerName]
 * @property {number} [totalAmount]
 * @property {number} [paidAmount]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} PaymentCreateSync
 * @property {string} invoiceId
 * @property {number} amount
 * @property {string} [method]
 * @property {string} [note]
 */

/**
 * @typedef {Object} SyncPayload
 * @property {string} [clientId]
 * @property {Object} [item]
 * @property {ItemCreateSync[]} [item.create]
 * @property {ItemUpdateSync[]} [item.update]
 * @property {string[]} [item.delete]
 * @property {Object} [invoice]
 * @property {InvoiceCreateSync[]} [invoice.create]
 * @property {Object} [payment]
 * @property {PaymentCreateSync[]} [payment.create]
 */

export {};

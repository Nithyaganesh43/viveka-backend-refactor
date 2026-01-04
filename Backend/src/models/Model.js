import mongoose from 'mongoose';

const { Schema } = mongoose;

// ============================================================================
// CLIENT (Business Owner)
// ============================================================================
const clientSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      index: true,
      trim: true,
      match: [/^\d{10,}$/, 'Please provide a valid phone number'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
      minlength: [2, 'Owner name must be at least 2 characters'],
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ============================================================================
// OTP SESSION (Registration Only)
// ============================================================================
const otpSessionSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      index: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration time is required'],
      index: { expireAfterSeconds: 600 }, // Auto-delete after 10 minutes
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: [5, 'Maximum OTP attempts exceeded'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: false }
);

// ============================================================================
// DEVICE SESSION (One Active per Client)
// ============================================================================
const deviceSessionSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
    },
    deviceName: {
      type: String,
      trim: true,
      default: 'Unknown Device',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: true }
);

deviceSessionSchema.index({ clientId: 1, deviceId: 1 }, { unique: true });

// ============================================================================
// CUSTOMER (End User – Phone Based)
// ============================================================================
const customerSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\d{10,}$/, 'Please provide a valid phone number'],
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    lastPurchaseAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

customerSchema.index({ clientId: 1, phoneNumber: 1 }, { unique: true });

// ============================================================================
// ITEM GROUP
// ============================================================================
const itemGroupSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item group name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============================================================================
// ITEM
// ============================================================================
const itemSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'ItemGroup',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [2, 'Item name must be at least 2 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    unit: {
      type: String,
      default: 'nos',
      enum: ['nos', 'kg', 'litre', 'meter', 'pcs'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============================================================================
// CART (Temporary, No Invoice Yet)
// ============================================================================
const cartSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: null,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    itemCount: {
      type: Number,
      default: 0,
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expireAfterSeconds: 86400 }, // Auto-delete after 24 hours
    },
  },
  { timestamps: true }
);

// ============================================================================
// CART ITEM
// ============================================================================
const cartItemSchema = new Schema(
  {
    cartId: {
      type: Schema.Types.ObjectId,
      ref: 'Cart',
      required: [true, 'Cart ID is required'],
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item ID is required'],
    },
    itemNameSnapshot: {
      type: String,
      required: [true, 'Item name snapshot is required'],
    },
    unitPriceSnapshot: {
      type: Number,
      required: [true, 'Unit price snapshot is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    lineTotal: {
      type: Number,
      required: [true, 'Line total is required'],
      min: [0, 'Line total cannot be negative'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: false }
);

// ============================================================================
// INCOMPLETE SALE (Paid Amount < Total Amount - No Invoice Generated)
// ============================================================================
const incompleteSaleSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      match: [/^\d{10,}$/, 'Please provide a valid phone number'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paidAmount: {
      type: Number,
      required: [true, 'Paid amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    items: [
      {
        itemName: String,
        unitPrice: Number,
        quantity: Number,
        lineTotal: Number,
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  { timestamps: false }
);

// ============================================================================
// INVOICE (Only if Paid Amount == Total Amount) - IMMUTABLE AFTER GENERATION
// ============================================================================
const invoiceSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paidAmount: {
      type: Number,
      required: [true, 'Paid amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    isFinalized: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ clientId: 1, invoiceNumber: 1 }, { unique: true });

// ============================================================================
// INVOICE ITEM
// ============================================================================
const invoiceItemSchema = new Schema(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice ID is required'],
      index: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    lineTotal: {
      type: Number,
      required: [true, 'Line total is required'],
      min: [0, 'Line total cannot be negative'],
    },
  },
  { timestamps: false }
);

// ============================================================================
// PURCHASE HISTORY
// ============================================================================
const purchaseHistorySchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice ID is required'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  { timestamps: false }
);

// ============================================================================
// EXPORT MODELS
// ============================================================================
export const Client = mongoose.model('Client', clientSchema);
export const OtpSession = mongoose.model('OtpSession', otpSessionSchema);
export const DeviceSession = mongoose.model(
  'DeviceSession',
  deviceSessionSchema
);
export const Customer = mongoose.model('Customer', customerSchema);
export const ItemGroup = mongoose.model('ItemGroup', itemGroupSchema);
export const Item = mongoose.model('Item', itemSchema);
export const Cart = mongoose.model('Cart', cartSchema);
export const CartItem = mongoose.model('CartItem', cartItemSchema);
export const IncompleteSale = mongoose.model(
  'IncompleteSale',
  incompleteSaleSchema
);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
export const InvoiceItem = mongoose.model('InvoiceItem', invoiceItemSchema);
export const PurchaseHistory = mongoose.model(
  'PurchaseHistory',
  purchaseHistorySchema
);

// ============================================================================
// PAYMENT (Multiple payments per invoice)
// ============================================================================
const paymentSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank', 'other'],
      default: 'cash',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);

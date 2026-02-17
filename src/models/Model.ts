import mongoose, { Schema, Document, Types } from "mongoose";

const { ObjectId } = Schema.Types;

/* =========================================================
   CLIENT
========================================================= */

export interface IClient extends Document {
  phoneNumber: string;
  ownerName: string;
  businessName: string;
  shopName?: string;
  location?: string;
  city?: string;
  state?: string;
  gstin?: string;
  profileUrl?: string;
  clientSettings?: {
    customerFields?: {
      address?: boolean;
      gstNo?: boolean;
      emailId?: boolean;
    };
  };
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    phoneNumber: { type: String, required: true, unique: true, index: true },
    ownerName: { type: String, required: true },
    businessName: { type: String, required: true },
    shopName: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    gstin: { type: String, default: "" },
    profileUrl: { type: String, default: "" },
    clientSettings: {
      customerFields: {
        address: { type: Boolean, default: false },
        gstNo: { type: Boolean, default: false },
        emailId: { type: Boolean, default: false },
      },
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* =========================================================
   OTP SESSION
========================================================= */

export interface IOtpSession extends Document {
  phoneNumber: string;
  purpose: "generic" | "register" | "login";
  otpHash: string;
  expiresAt: Date;
  isVerified: boolean;
  attempts: number;
}

const otpSessionSchema = new Schema<IOtpSession>({
  phoneNumber: { type: String, required: true, index: true },
  purpose: { type: String, enum: ["generic", "register", "login"], default: "generic" },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  isVerified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
});

/* =========================================================
   DEVICE SESSION
========================================================= */

export interface IDeviceSession extends Document {
  clientId: Types.ObjectId;
  deviceId: string;
  isActive: boolean;
  lastSeenAt: Date;
}

const deviceSessionSchema = new Schema<IDeviceSession>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    deviceId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* =========================================================
   CLIENT CUSTOMER
========================================================= */

export interface IClientCustomer extends Document {
  clientId: Types.ObjectId;
  phoneNumber: string;
  name?: string;
  address?: string;
  emailId?: string;
  gstNo?: string;
  isActive: boolean;
  lastPurchaseAt?: Date | null;
}

const clientCustomerSchema = new Schema<IClientCustomer>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    phoneNumber: { type: String, required: true },
    name: { type: String, default: "" },
    address: { type: String, default: "" },
    emailId: { type: String, default: "" },
    gstNo: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    lastPurchaseAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* =========================================================
   ITEM GROUP
========================================================= */

export interface IItemGroup extends Document {
  clientId: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
}

const itemGroupSchema = new Schema<IItemGroup>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* =========================================================
   ITEM
========================================================= */

export interface IItem extends Document {
  clientId: Types.ObjectId;
  groupId?: Types.ObjectId | null;
  name: string;
  price: number;
  stock: number;
  lowStockQuantity: number;
  unit: string;
  description?: string;
  isActive: boolean;
}

const itemSchema = new Schema<IItem>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    groupId: { type: ObjectId, ref: "ItemGroup", default: null },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    lowStockQuantity: { type: Number, default: 5 },
    unit: { type: String, default: "nos" },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* =========================================================
   CART
========================================================= */

export interface ICart extends Document {
  clientId: Types.ObjectId;
  clientCustomerPhone?: string;
  totalAmount: number;
  itemCount: number;
  isFinalized: boolean;
}

const cartSchema = new Schema<ICart>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    clientCustomerPhone: { type: String, default: "" },
    totalAmount: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 },
    isFinalized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* =========================================================
   CART ITEM
========================================================= */

export interface ICartItem extends Document {
  cartId: Types.ObjectId;
  itemId?: Types.ObjectId | null;
  itemNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
  isActive: boolean;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    cartId: { type: ObjectId, ref: "Cart", required: true, index: true },
    itemId: { type: ObjectId, ref: "Item", default: null },
    itemNameSnapshot: { type: String, required: true },
    unitPriceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* =========================================================
   INVOICE
========================================================= */

export interface IInvoice extends Document {
  clientId: Types.ObjectId;
  clientCustomerId?: Types.ObjectId | null;
  clientCustomerName?: string;
  clientCustomerPhone?: string;
  invoiceNumber: string;
  invoiceDate?: Date;
  dueDate?: Date;
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  paidAmount: number;
  products: Array<{
    productId?: Types.ObjectId | null;
    itemName: string;
    costPerUnit: number;
    quantity: number;
    itemGroup?: string;
  }>;
  notes?: string;
  isFinalized: boolean;
  generatedAt?: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    clientCustomerId: { type: ObjectId, ref: "clientCustomer", default: null },
    clientCustomerName: { type: String, default: "" },
    clientCustomerPhone: { type: String, default: "" },
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    subtotal: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, required: true, default: 0 },
    products: {
      type: [
        {
          productId: { type: ObjectId, ref: "Item", default: null },
          itemName: { type: String, required: true },
          costPerUnit: { type: Number, required: true, min: 0 },
          quantity: { type: Number, required: true, min: 1 },
          itemGroup: { type: String, default: "" },
        },
      ],
      default: [],
    },
    notes: { type: String, default: "" },
    isFinalized: { type: Boolean, default: false },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* =========================================================
   PAYMENT
========================================================= */

export interface IPayment extends Document {
  clientId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  amount: number;
  method: string;
  note?: string;
  paidAt?: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    invoiceId: { type: ObjectId, ref: "Invoice", required: true },
    amount: { type: Number, required: true },
    method: { type: String, default: "cash" },
    note: { type: String, default: "" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* =========================================================
   PURCHASE HISTORY
========================================================= */

export interface IPurchaseHistory extends Document {
  clientId: Types.ObjectId;
  clientCustomerId?: Types.ObjectId | null;
  clientCustomerPhone?: string;
  invoiceId: Types.ObjectId;
  totalAmount: number;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>(
  {
    clientId: { type: ObjectId, ref: "Client", required: true },
    clientCustomerId: { type: ObjectId, ref: "clientCustomer", default: null },
    clientCustomerPhone: { type: String, default: "" },
    invoiceId: { type: ObjectId, ref: "Invoice", required: true },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* =========================================================
   EXPORT MODELS
========================================================= */

export const Client = mongoose.model<IClient>("Client", clientSchema);
export const OtpSession = mongoose.model<IOtpSession>("OtpSession", otpSessionSchema);
export const DeviceSession = mongoose.model<IDeviceSession>("DeviceSession", deviceSessionSchema);
export const clientCustomer = mongoose.model<IClientCustomer>("clientCustomer", clientCustomerSchema);
export const ItemGroup = mongoose.model<IItemGroup>("ItemGroup", itemGroupSchema);
export const Item = mongoose.model<IItem>("Item", itemSchema);
export const Cart = mongoose.model<ICart>("Cart", cartSchema);
export const CartItem = mongoose.model<ICartItem>("cartItem", cartItemSchema);
export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
export const PurchaseHistory = mongoose.model<IPurchaseHistory>("purchasehistory", purchaseHistorySchema);

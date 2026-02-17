export interface ItemCreateSync {
  name: string;
  price: number;
  stock?: number;
  lowStockQuantity?: number;
  unit?: string;
  groupId?: string;
  description?: string;
}

export interface ItemUpdateSync {
  _id: string;
  name?: string;
  price?: number;
  stock?: number;
  lowStockQuantity?: number;
  unit?: string;
  groupId?: string;
  description?: string;
}

export interface InvoiceProductSync {
  productId?: string;
  itemName: string;
  itemGroup?: string;
  quantity: number;
  costPerUnit: number;
}

export interface InvoiceCreateSync {
  products: InvoiceProductSync[];
  clientCustomerId?: string;
  clientCustomerPhone?: string;
  clientCustomerName?: string;
  totalAmount?: number;
  paidAmount?: number;
  notes?: string;
}

export interface PaymentCreateSync {
  invoiceId: string;
  amount: number;
  method?: string;
  note?: string;
}

export interface SyncPayload {
  clientId?: string;
  item?: {
    create?: ItemCreateSync[];
    update?: ItemUpdateSync[];
    delete?: string[];
  };
  invoice?: {
    create?: InvoiceCreateSync[];
  };
  payment?: {
    create?: PaymentCreateSync[];
  };
}

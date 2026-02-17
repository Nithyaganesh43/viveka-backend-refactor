// dto.ts

export interface CreateItemGroupRequest {
  clientId: string;
  name: string;
  description?: string;
}

export interface CreateItemRequest {
  clientId: string;
  name: string;
  price: number;
  stock?: number;
  lowStockQuantity?: number;
  unit?: string;
  groupId?: string;
  description?: string;
}

export interface CreateCustomerRequest {
  clientId: string;
  phone: string;
  name?: string;
  address?: string;
  emailId?: string;
  gstNo?: string;
}

export interface CreateCartRequest {
  clientId: string;
  clientCustomerId?: string;
  clientCustomerPhone?: string;
}

export interface AddCartItemRequest {
  cartId: string;
  itemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
}

export interface GenerateInvoiceRequest {
  clientId: string;
  cartId: string;
  clientCustomerId?: string;
  clientCustomerPhone?: string;
  clientCustomerName?: string;
  totalAmount?: number;
  paidAmount?: number;
  notes?: string;
}

export interface InvoiceProduct {
  productId?: string;
  itemName: string;
  itemGroup?: string;
  quantity: number;
  costPerUnit: number;
}

export interface GenerateInvoiceWithProductsRequest {
  clientId: string;
  products: InvoiceProduct[];
  clientCustomerId?: string;
  clientCustomerPhone?: string;
  clientCustomerName?: string;
  totalAmount?: number;
  paidAmount?: number;
  notes?: string;
}

export interface RecordPaymentRequest {
  clientId: string;
  invoiceId: string;
  amount: number;
  method?: string;
  note?: string;
}

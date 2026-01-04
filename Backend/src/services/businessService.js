import {
  Item,
  ItemGroup,
  Customer,
  Cart,
  CartItem,
  Invoice,
  InvoiceItem,
  IncompleteSale,
  PurchaseHistory,
  Payment,
} from '../models/Model.js';

// ============================================================================
// ITEM GROUP SERVICES
// ============================================================================
export const createItemGroup = async (clientId, name, description = '') => {
  try {
    const itemGroup = await ItemGroup.create({
      clientId,
      name,
      description,
    });
    return { success: true, itemGroup };
  } catch (error) {
    throw new Error(`Failed to create item group: ${error.message}`);
  }
};

export const getItemGroups = async (clientId) => {
  try {
    const itemGroups = await ItemGroup.find({ clientId });
    return { success: true, itemGroups };
  } catch (error) {
    throw new Error(`Failed to fetch item groups: ${error.message}`);
  }
};

export const updateItemGroup = async (clientId, groupId, updateData) => {
  try {
    const itemGroup = await ItemGroup.findOneAndUpdate(
      { _id: groupId, clientId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!itemGroup) {
      throw new Error('Item group not found');
    }
    return { success: true, itemGroup };
  } catch (error) {
    throw new Error(`Failed to update item group: ${error.message}`);
  }
};

export const deleteItemGroup = async (clientId, groupId) => {
  try {
    const itemGroup = await ItemGroup.findOneAndDelete({
      _id: groupId,
      clientId,
    });
    if (!itemGroup) {
      throw new Error('Item group not found');
    }
    return { success: true, message: 'Item group deleted' };
  } catch (error) {
    throw new Error(`Failed to delete item group: ${error.message}`);
  }
};

// ============================================================================
// ITEM SERVICES
// ============================================================================
export const createItem = async (
  clientId,
  name,
  price,
  unit = 'nos',
  groupId = null,
  description = ''
) => {
  try {
    const item = await Item.create({
      clientId,
      name,
      price,
      unit,
      groupId,
      description,
    });
    return { success: true, item };
  } catch (error) {
    throw new Error(`Failed to create item: ${error.message}`);
  }
};

export const getItems = async (clientId, groupId = null) => {
  try {
    const filter = { clientId, isActive: true };
    if (groupId) {
      filter.groupId = groupId;
    }
    const items = await Item.find(filter);
    return { success: true, items };
  } catch (error) {
    throw new Error(`Failed to fetch items: ${error.message}`);
  }
};

export const updateItem = async (clientId, itemId, updateData) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: itemId, clientId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!item) {
      throw new Error('Item not found');
    }
    return { success: true, item };
  } catch (error) {
    throw new Error(`Failed to update item: ${error.message}`);
  }
};

export const deleteItem = async (clientId, itemId) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: itemId, clientId },
      { isActive: false },
      { new: true }
    );
    if (!item) {
      throw new Error('Item not found');
    }
    return { success: true, message: 'Item deleted' };
  } catch (error) {
    throw new Error(`Failed to delete item: ${error.message}`);
  }
};

// ============================================================================
// CUSTOMER SERVICES
// ============================================================================
export const getOrCreateCustomer = async (clientId, phoneNumber) => {
  try {
    let customer = await Customer.findOne({ clientId, phoneNumber });
    if (!customer) {
      customer = await Customer.create({
        clientId,
        phoneNumber,
      });
    }
    return { success: true, customer };
  } catch (error) {
    throw new Error(`Failed to get/create customer: ${error.message}`);
  }
};

export const getCustomers = async (clientId) => {
  try {
    const customers = await Customer.find({ clientId });
    return { success: true, customers };
  } catch (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }
};

// ============================================================================
// CART SERVICES
// ============================================================================
export const createCart = async (clientId, customerPhone = null) => {
  try {
    const cart = await Cart.create({
      clientId,
      customerPhone,
      totalAmount: 0,
      itemCount: 0,
    });
    return { success: true, cart };
  } catch (error) {
    throw new Error(`Failed to create cart: ${error.message}`);
  }
};

export const addToCart = async (
  cartId,
  itemId,
  itemName,
  unitPrice,
  quantity
) => {
  try {
    const lineTotal = unitPrice * quantity;

    const cartItem = await CartItem.create({
      cartId,
      itemId,
      itemNameSnapshot: itemName,
      unitPriceSnapshot: unitPrice,
      quantity,
      lineTotal,
    });

    // Update cart totals
    const cart = await Cart.findById(cartId);
    cart.totalAmount += lineTotal;
    cart.itemCount += 1;
    await cart.save();

    return { success: true, cartItem };
  } catch (error) {
    throw new Error(`Failed to add item to cart: ${error.message}`);
  }
};

export const removeFromCart = async (cartId, cartItemId) => {
  try {
    const cartItem = await CartItem.findByIdAndDelete(cartItemId);
    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    // Update cart totals
    const cart = await Cart.findById(cartId);
    cart.totalAmount -= cartItem.lineTotal;
    cart.itemCount -= 1;
    await cart.save();

    return { success: true, message: 'Item removed from cart' };
  } catch (error) {
    throw new Error(`Failed to remove item from cart: ${error.message}`);
  }
};

export const getCart = async (cartId) => {
  try {
    const cart = await Cart.findById(cartId);
    const cartItems = await CartItem.find({ cartId });
    if (!cart) {
      throw new Error('Cart not found');
    }
    return { success: true, cart, cartItems };
  } catch (error) {
    throw new Error(`Failed to fetch cart: ${error.message}`);
  }
};

export const clearCart = async (cartId) => {
  try {
    await CartItem.deleteMany({ cartId });
    await Cart.findByIdAndDelete(cartId);
    return { success: true, message: 'Cart cleared' };
  } catch (error) {
    throw new Error(`Failed to clear cart: ${error.message}`);
  }
};

// ============================================================================
// INVOICE & PAYMENT SERVICES
// ============================================================================
export const generateInvoice = async (
  clientId,
  customerId,
  cartId,
  totalAmount,
  paidAmount,
  notes = ''
) => {
  try {
    // Validate: paid amount must be <= total
    if (paidAmount > totalAmount) {
      throw new Error('Paid amount cannot exceed total amount');
    }

    // Get cart items
    const cartItems = await CartItem.find({ cartId });
    if (!cartItems.length) {
      throw new Error('Cart is empty');
    }

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Only allow invoice generation when the bill is fully paid
    if (paidAmount < totalAmount) {
      throw new Error(
        'Invoice can only be generated when full payment is received. For partial payments use the incomplete-sale endpoint.'
      );
    }

    // Create finalized invoice (paid in full)
    const invoice = await Invoice.create({
      clientId,
      customerId,
      invoiceNumber,
      totalAmount,
      paidAmount,
      notes,
      isFinalized: true,
    });

    // Record the payment that completed the invoice
    if (paidAmount > 0) {
      await Payment.create({
        clientId,
        invoiceId: invoice._id,
        amount: paidAmount,
        method: 'other',
        note: 'Payment on invoice generation (paid in full)',
      });
    }

    // Create invoice items
    const invoiceItems = await Promise.all(
      cartItems.map((cartItem) =>
        InvoiceItem.create({
          invoiceId: invoice._id,
          itemName: cartItem.itemNameSnapshot,
          unitPrice: cartItem.unitPriceSnapshot,
          quantity: cartItem.quantity,
          lineTotal: cartItem.lineTotal,
        })
      )
    );

    // If invoice is finalized (fully paid) create purchase history
    if (invoice.isFinalized && customerId) {
      await PurchaseHistory.create({
        clientId,
        customerId,
        invoiceId: invoice._id,
        totalAmount,
      });
    }

    // Clear cart
    await clearCart(cartId);

    return { success: true, invoice, invoiceItems };
  } catch (error) {
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
};

// Record a payment against an existing invoice (supports multiple payments)
export const recordPayment = async (
  clientId,
  invoiceId,
  amount,
  method = 'cash',
  note = ''
) => {
  try {
    if (amount <= 0) throw new Error('Payment amount must be positive');

    const invoice = await Invoice.findOne({ _id: invoiceId, clientId });
    if (!invoice) throw new Error('Invoice not found');

    const remaining = invoice.totalAmount - invoice.paidAmount;
    if (amount > remaining)
      throw new Error('Payment exceeds outstanding balance');

    // Create payment record
    const payment = await Payment.create({
      clientId,
      invoiceId,
      amount,
      method,
      note,
    });

    // Update invoice paidAmount and finalize if necessary
    invoice.paidAmount += amount;
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.isFinalized = true;
      // create purchase history if customer present
      if (invoice.customerId) {
        await PurchaseHistory.create({
          clientId,
          customerId: invoice.customerId,
          invoiceId: invoice._id,
          totalAmount: invoice.totalAmount,
        });
      }
    }
    await invoice.save();

    return { success: true, payment, invoice };
  } catch (error) {
    throw new Error(`Failed to record payment: ${error.message}`);
  }
};

export const getPaymentsForInvoice = async (invoiceId) => {
  try {
    const payments = await Payment.find({ invoiceId });
    return { success: true, payments };
  } catch (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }
};

export const createIncompleteSale = async (
  clientId,
  customerPhone,
  cartId,
  totalAmount,
  paidAmount,
  notes = ''
) => {
  try {
    // Validate: paid amount must be less than total
    if (paidAmount >= totalAmount) {
      throw new Error(
        'For incomplete sales, paid amount must be less than total'
      );
    }

    // Get cart items
    const cartItems = await CartItem.find({ cartId });
    if (!cartItems.length) {
      throw new Error('Cart is empty');
    }

    // Create incomplete sale record
    const incompleteSale = await IncompleteSale.create({
      clientId,
      customerPhone,
      totalAmount,
      paidAmount,
      items: cartItems.map((item) => ({
        itemName: item.itemNameSnapshot,
        unitPrice: item.unitPriceSnapshot,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      notes,
    });

    // Clear cart
    await clearCart(cartId);

    return { success: true, incompleteSale };
  } catch (error) {
    throw new Error(`Failed to create incomplete sale: ${error.message}`);
  }
};

export const getInvoices = async (clientId) => {
  try {
    const invoices = await Invoice.find({ clientId }).populate('customerId');
    return { success: true, invoices };
  } catch (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }
};

export const getPurchaseHistory = async (clientId, customerId = null) => {
  try {
    const filter = { clientId };
    if (customerId) {
      filter.customerId = customerId;
    }
    const purchaseHistory = await PurchaseHistory.find(filter)
      .populate('customerId')
      .populate('invoiceId');
    return { success: true, purchaseHistory };
  } catch (error) {
    throw new Error(`Failed to fetch purchase history: ${error.message}`);
  }
};

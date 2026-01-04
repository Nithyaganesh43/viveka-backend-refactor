import * as businessService from '../../services/businessService.js';

// ============================================================================
// ITEM GROUP CONTROLLERS
// ============================================================================
export const createItemGroupController = async (req, res) => {
  try {
    const { clientId, name, description } = req.body;

    if (!clientId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and item group name are required',
      });
    }

    const result = await businessService.createItemGroup(
      clientId,
      name,
      description
    );
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getItemGroupsController = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await businessService.getItemGroups(clientId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateItemGroupController = async (req, res) => {
  try {
    const { clientId, groupId } = req.params;
    const updateData = req.body;

    if (!clientId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and group ID are required',
      });
    }

    const result = await businessService.updateItemGroup(
      clientId,
      groupId,
      updateData
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteItemGroupController = async (req, res) => {
  try {
    const { clientId, groupId } = req.params;

    if (!clientId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and group ID are required',
      });
    }

    const result = await businessService.deleteItemGroup(clientId, groupId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ITEM CONTROLLERS
// ============================================================================
export const createItemController = async (req, res) => {
  try {
    const { clientId, name, price, unit, groupId, description } = req.body;

    if (!clientId || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, item name, and price are required',
      });
    }

    const result = await businessService.createItem(
      clientId,
      name,
      price,
      unit,
      groupId,
      description
    );
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getItemsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { groupId } = req.query;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await businessService.getItems(clientId, groupId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateItemController = async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    const updateData = req.body;

    if (!clientId || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and item ID are required',
      });
    }

    const result = await businessService.updateItem(
      clientId,
      itemId,
      updateData
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteItemController = async (req, res) => {
  try {
    const { clientId, itemId } = req.params;

    if (!clientId || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and item ID are required',
      });
    }

    const result = await businessService.deleteItem(clientId, itemId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// CUSTOMER CONTROLLERS
// ============================================================================
export const getOrCreateCustomerController = async (req, res) => {
  try {
    const { clientId, phoneNumber } = req.body;

    if (!clientId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and phone number are required',
      });
    }

    const result = await businessService.getOrCreateCustomer(
      clientId,
      phoneNumber
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomersController = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await businessService.getCustomers(clientId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// CART CONTROLLERS
// ============================================================================
export const createCartController = async (req, res) => {
  try {
    const { clientId, customerPhone } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await businessService.createCart(clientId, customerPhone);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCartController = async (req, res) => {
  try {
    const { cartId, itemId, itemName, unitPrice, quantity } = req.body;

    if (
      !cartId ||
      !itemId ||
      !itemName ||
      unitPrice === undefined ||
      !quantity
    ) {
      return res.status(400).json({
        success: false,
        message: 'All cart item fields are required',
      });
    }

    const result = await businessService.addToCart(
      cartId,
      itemId,
      itemName,
      unitPrice,
      quantity
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCartController = async (req, res) => {
  try {
    const { cartId, cartItemId } = req.body;

    if (!cartId || !cartItemId) {
      return res.status(400).json({
        success: false,
        message: 'Cart ID and cart item ID are required',
      });
    }

    const result = await businessService.removeFromCart(cartId, cartItemId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCartController = async (req, res) => {
  try {
    const { cartId } = req.params;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: 'Cart ID is required',
      });
    }

    const result = await businessService.getCart(cartId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCartController = async (req, res) => {
  try {
    const { cartId } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: 'Cart ID is required',
      });
    }

    const result = await businessService.clearCart(cartId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INVOICE & PAYMENT CONTROLLERS
// ============================================================================
export const generateInvoiceController = async (req, res) => {
  try {
    const { clientId, customerId, cartId, totalAmount, paidAmount, notes } =
      req.body;

    if (
      !clientId ||
      !cartId ||
      totalAmount === undefined ||
      paidAmount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Client ID, cart ID, total amount, and paid amount are required',
      });
    }

    const result = await businessService.generateInvoice(
      clientId,
      customerId,
      cartId,
      totalAmount,
      paidAmount,
      notes
    );
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const createIncompleteSaleController = async (req, res) => {
  try {
    const { clientId, customerPhone, cartId, totalAmount, paidAmount, notes } =
      req.body;

    if (
      !clientId ||
      !customerPhone ||
      !cartId ||
      totalAmount === undefined ||
      paidAmount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    const result = await businessService.createIncompleteSale(
      clientId,
      customerPhone,
      cartId,
      totalAmount,
      paidAmount,
      notes
    );
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getInvoicesController = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await businessService.getInvoices(clientId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordPaymentController = async (req, res) => {
  try {
    const { clientId, invoiceId, amount, method, note } = req.body;

    if (!clientId || !invoiceId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'clientId, invoiceId and amount are required',
      });
    }

    const result = await businessService.recordPayment(
      clientId,
      invoiceId,
      amount,
      method,
      note
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getPaymentsController = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    if (!invoiceId) {
      return res
        .status(400)
        .json({ success: false, message: 'invoiceId is required' });
    }
    const result = await businessService.getPaymentsForInvoice(invoiceId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchaseHistoryController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { customerId } = req.query;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await businessService.getPurchaseHistory(
      clientId,
      customerId
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

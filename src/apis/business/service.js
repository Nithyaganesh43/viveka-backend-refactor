import mongoose from 'mongoose';
import repository from '../../repository/repository.js';

// Helper to return invoice products as stored snapshots
const buildInvoiceWithProductDetails = async (invoiceDoc) => {
  if (!invoiceDoc) return invoiceDoc;

  const invoiceObj =
    typeof invoiceDoc.toObject === 'function'
      ? invoiceDoc.toObject()
      : { ...invoiceDoc };

  const products = (invoiceObj.products || []).map((product) => ({
    productId: product.productId || null,
    itemName: product.itemName || '',
    costPerUnit: product.costPerUnit,
    quantity: product.quantity,
    itemGroup: product.itemGroup || '',
  }));

  return { ...invoiceObj, products };
};

const normalizeItemsForSyncResponse = (items) =>
  items.map((item) => ({
    ...item.toObject(),
    groupId: item.groupId ? item.groupId.toString() : null,
    productId: item._id ? item._id.toString() : null,
  }));

const parseDateValue = (value) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const resolveClientCustomerForInvoice = async ({
  clientId,
  providedclientCustomerId,
  clientCustomerName,
  clientCustomerPhone,
  customerPhone,
  fallbackPhone,
}) => {
  let customerDoc = null;
  const resolvedclientCustomerId = providedclientCustomerId || null;

  if (resolvedclientCustomerId) {
    customerDoc = await repository.findOne('clientcustomers', {
      _id: resolvedclientCustomerId,
      clientId,
    });
  }

  const phoneToUse =
    clientCustomerPhone ||
    customerPhone ||
    fallbackPhone ||
    customerDoc?.phoneNumber ||
    '';
  const nameToUse = clientCustomerName || customerDoc?.name || '';

  if (!customerDoc && phoneToUse) {
    const createResult = await createclientCustomer(
      clientId,
      nameToUse || 'clientCustomer',
      phoneToUse,
    );
    customerDoc = createResult.clientCustomer;
  }

  const clientCustomerId = customerDoc?._id || resolvedclientCustomerId || null;

  return {
    customerDoc,
    clientCustomerId,
    nameToUse,
    phoneToUse,
  };
};

const getFullClientData = async (clientId) => {
  const [
    itemGroups,
    items,
    clientCustomers,
    rawInvoices,
    payments,
    purchaseHistory,
  ] = await Promise.all([
    repository.find('itemgroups', { clientId }),
    repository.find('items', { clientId }),
    repository.find('clientcustomers', { clientId }, null, { sort: { createdAt: -1 } }),
    repository.find('invoices', { clientId }, null, { populate: 'clientCustomerId' }),
    repository.find('payments', { clientId }),
    repository.find('purchasehistories', { clientId }, null, { populate: ['clientCustomerId', 'invoiceId'] }),
  ]);

  const invoices = await Promise.all(
    rawInvoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
  );

  return {
    itemGroups,
    items: normalizeItemsForSyncResponse(items),
    clientCustomers,
    invoices,
    payments,
    purchaseHistory,
  };
};

// ============================================================================
// ITEM GROUP SERVICES
// ============================================================================
export const createItemGroup = async (clientId, name, description = '') => {
  try {
    const itemGroup = await repository.create('itemgroups', {
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
    const itemGroups = await repository.find('itemgroups', { clientId });
    return { success: true, itemGroups };
  } catch (error) {
    throw new Error(`Failed to fetch item groups: ${error.message}`);
  }
};

export const updateItemGroup = async (clientId, groupId, updateData) => {
  try {
    const itemGroup = await repository.updateOne(
      'itemgroups',
      { _id: groupId, clientId },
      { ...updateData, updatedAt: new Date() },
      { new: true },
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
    const itemGroup = await repository.updateOne(
      'itemgroups',
      { _id: groupId, clientId },
      { isActive: false },
      { new: true },
    );
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
  stock = 0,
  lowStockQuantity = 5,
  unit = 'nos',
  groupId = null,
  description = '',
) => {
  try {
    const item = await repository.create('items', {
      clientId,
      name,
      price,
      stock,
      lowStockQuantity,
      unit,
      groupId,
      description,
    });
    const itemObject = item.toObject();
    return {
      success: true,
      item: { ...itemObject, productId: item._id.toString() },
    };
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
    const items = await repository.find('items', filter);
    const normalizedItems = items.map((item) => ({
      ...item.toObject(),
      groupId: item.groupId ? item.groupId.toString() : null,
      dealerIds: (item.dealerIds || []).map((id) => id.toString()),
      productId: item._id ? item._id.toString() : null,
    }));
    return { success: true, items: normalizedItems };
  } catch (error) {
    throw new Error(`Failed to fetch items: ${error.message}`);
  }
};

export const updateItem = async (clientId, itemId, updateData) => {
  try {
    const item = await repository.updateOne(
      'items',
      { _id: itemId, clientId },
      { ...updateData, updatedAt: new Date() },
      { new: true },
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
    const item = await repository.updateOne(
      'items',
      { _id: itemId, clientId },
      { isActive: false },
      { new: true },
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
// CLIENT clientCustomer SERVICES (Client clientCustomers with name and phone)
// ============================================================================
const sanitizeclientCustomerName = (rawName) => {
  const trimmed = (rawName || '').trim();
  if (trimmed.length >= 2) return trimmed;
  return 'clientCustomer';
};

export const createclientCustomer=async(
  clientId,
  name,
  phone,
  address='',
  emailId='',
  gstNo=''
)=>{
  const phoneNumber=(phone||'').trim();
  const nameToUse=sanitizeclientCustomerName(name);

  const requireIfEnabled=(enabled,value,label)=>{
    if(enabled&&(!value||value.trim()===''))
      throw new Error(`${label} is required`);
  };

  try{
    const client=await repository.findById('clients', clientId, null, { lean: true });
    if(!client) throw new Error('Client not found');

    const settings={
      address:false,
      emailId:false,
      gstNo:false,
      ...(client.clientSettings?.customerFields||{})
    };

    requireIfEnabled(settings.address,address,'Address');
    requireIfEnabled(settings.emailId,emailId,'Email');
    requireIfEnabled(settings.gstNo,gstNo,'GST number');

    const existing=await repository.findOne('clientcustomers', {clientId,phoneNumber});
    if(existing){
      let changed=false;

      if(name&&existing.name!==nameToUse){
        existing.name=nameToUse;
        changed=true;
      }

      if(settings.address&&existing.address!==address){
        existing.address=address;
        changed=true;
      }

      if(settings.emailId&&existing.emailId!==emailId){
        existing.emailId=emailId;
        changed=true;
      }

      if(settings.gstNo&&existing.gstNo!==gstNo){
        existing.gstNo=gstNo;
        changed=true;
      }

      if(changed){
        existing.updatedAt=new Date();
        await repository.updateById(
          'clientcustomers',
          existing._id,
          existing,
        );
      }

      return{success:true,clientCustomer:existing,isNew:false};
    }

    const payload={
      clientId,
      name:nameToUse,
      phoneNumber
    };

    if(settings.address) payload.address=address;
    if(settings.emailId) payload.emailId=emailId;
    if(settings.gstNo) payload.gstNo=gstNo;

    const created=await repository.create('clientcustomers', payload);
    return{success:true,clientCustomer:created,isNew:true};
  }catch(error){
    throw new Error(`Failed to create client clientCustomer: ${error.message}`);
  }
};


export const getclientCustomers = async (clientId) => {
  try {
    const clientCustomers = await repository.find('clientcustomers', { clientId }, null, {
      sort: { createdAt: -1 },
    });
    return { success: true, clientCustomers };
  } catch (error) {
    throw new Error(`Failed to fetch client clientCustomers: ${error.message}`);
  }
};

export const getClientCustomerByPhone = async (clientId, phone) => {
  try {
    const customer = await repository.findOne('clientcustomers', {
      clientId,
      phoneNumber: phone,
    });
    return { success: true, clientCustomer: customer };
  } catch (error) {
    throw new Error(`Failed to fetch client clientCustomer: ${error.message}`);
  }
};

export const updateClientCustomer=async(
  clientId,
  clientCustomerId,
  updateData
)=>{
  const requireIfEnabled=(enabled,value,label)=>{
    if(enabled&&value===undefined)
      throw new Error(`${label} is required`);
    if(enabled&&(!value||value.trim()===''))
      throw new Error(`${label} is required`);
  };

  try{
    const client=await repository.findById('clients', clientId, null, { lean: true });
    if(!client) throw new Error('Client not found');

    const settings={
      address:false,
      emailId:false,
      gstNo:false,
      ...(client.clientSettings?.customerFields||{})
    };

    requireIfEnabled(settings.address,updateData.address,'Address');
    requireIfEnabled(settings.emailId,updateData.emailId,'Email');
    requireIfEnabled(settings.gstNo,updateData.gstNo,'GST number');

    const payload={updatedAt:new Date()};

    if(updateData.name)
      payload.name=sanitizeclientCustomerName(updateData.name);

    if(settings.address) payload.address=updateData.address;
    if(settings.emailId) payload.emailId=updateData.emailId;
    if(settings.gstNo) payload.gstNo=updateData.gstNo;

    const updated=await repository.updateOne(
      'clientcustomers',
      {_id:clientCustomerId,clientId},
      {$set:payload},
      {new:true}
    );

    if(!updated)
      throw new Error('Client clientCustomer not found');

    return{success:true,clientCustomer:updated};
  }catch(error){
    throw new Error(`Failed to update client clientCustomer: ${error.message}`);
  }
};

export const deleteClientCustomer=async(clientId,clientCustomerId)=>{
  try{
    const deletedCustomer=await repository.updateOne(
      'clientcustomers',
      { _id:clientCustomerId, clientId },
      { isActive: false },
      { new: true }
    );
    if(!deletedCustomer)
      throw new Error('Client clientCustomer not found');
    return{success:true,message:'Client clientCustomer deleted'};
  }catch(error){
    throw new Error(`Failed to delete client clientCustomer: ${error.message}`);
  }
};

// ============================================================================
// CART SERVICES
// ============================================================================
export const createCart = async (clientId, clientCustomerPhone = null) => {
  try {
    const cart = await repository.create('carts', {
      clientId,
      clientCustomerPhone,
      totalAmount: 0,
      itemCount: 0,
    });
    return { success: true, cart };
  } catch (error) {
    throw new Error(`Failed to create cart: ${error.message}`);
  }
};

export const addToCart = async (
  clientId,
  cartId,
  itemId,
  itemName,
  unitPrice,
  quantity,
) => {
  try {
    const cart = await repository.findOne('carts', { _id: cartId, clientId });
    if (!cart) {
      throw new Error('Cart not found or access denied');
    }

    const lineTotal = unitPrice * quantity;

    const cartItem = await repository.create('cartitems', {
      cartId,
      itemId,
      itemNameSnapshot: itemName,
      unitPriceSnapshot: unitPrice,
      quantity,
      lineTotal,
    });

    // Update cart totals
    cart.totalAmount += lineTotal;
    cart.itemCount += 1;
    await repository.updateById('carts', cart._id, {
      totalAmount: cart.totalAmount,
      itemCount: cart.itemCount,
    });

    return { success: true, cartItem };
  } catch (error) {
    throw new Error(`Failed to add item to cart: ${error.message}`);
  }
};

export const removeFromCart = async (clientId, cartId, cartItemId) => {
  try {
    // Verify cart ownership first
    const cart = await repository.findOne('carts', { _id: cartId, clientId });
    if (!cart) {
      throw new Error('Cart not found or access denied');
    }

    const cartItem = await repository.updateOne(
      'cartitems',
      { _id: cartItemId, cartId },
      { isActive: false },
      { new: true },
    );
    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    // Update cart totals
    cart.totalAmount -= cartItem.lineTotal;
    cart.itemCount -= 1;
    await repository.updateById('carts', cart._id, {
      totalAmount: cart.totalAmount,
      itemCount: cart.itemCount,
    });

    return { success: true, message: 'Item removed from cart' };
  } catch (error) {
    throw new Error(`Failed to remove item from cart: ${error.message}`);
  }
};

export const getCart = async (clientId, cartId) => {
  try {
    const cart = await repository.findOne('carts', { _id: cartId, clientId });
    if (!cart) {
      throw new Error('Cart not found or access denied');
    }
    const cartItems = await repository.find('cartitems', { cartId });
    return { success: true, cart, cartItems };
  } catch (error) {
    throw new Error(`Failed to fetch cart: ${error.message}`);
  }
};

export const clearCart = async (clientId, cartId) => {
  try {
    // Verify cart ownership first
    const cart = await repository.findOne('carts', { _id: cartId, clientId });
    if (!cart) {
      throw new Error('Cart not found or access denied');
    }
    await repository.deleteMany('cartitems', { cartId });
    await repository.deleteById('carts', cartId);
    return { success: true, message: 'Cart cleared' };
  } catch (error) {
    throw new Error(`Failed to clear cart: ${error.message}`);
  }
};

// ============================================================================
// INVOICE & PAYMENT SERVICES
// ============================================================================
export const generateInvoice = async (clientId, invoiceData) => {
  try {
    const {
      cartId,
      clientCustomerId: providedclientCustomerId,
      clientCustomerName,
      clientCustomerPhone,
      customerPhone,
      invoiceNumber,
      invoiceDate,
      dueDate,
      totalAmount: providedTotalAmount,
      totalTax = 0,
      totalDiscount = 0,
      paidAmount: providedPaidAmount = 0,
      notes = '',
    } = invoiceData;

    if (!cartId) {
      throw new Error('cartId is required to generate invoice');
    }

    const cart = await repository.findById('carts', cartId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const cartItems = await repository.find('cartitems', { cartId });
    if (!cartItems.length) {
      throw new Error('Cart is empty');
    }

    const { clientCustomerId, nameToUse, phoneToUse } =
      await resolveClientCustomerForInvoice({
        clientId,
        providedclientCustomerId,
        clientCustomerName,
        clientCustomerPhone,
        customerPhone,
        fallbackPhone: cart.clientCustomerPhone || null,
      });

    const totalFromCart = cartItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    const totalAmount =
      typeof providedTotalAmount === 'number'
        ? providedTotalAmount
        : totalFromCart;
    const paidAmount =
      typeof providedPaidAmount === 'number' ? providedPaidAmount : 0;

    if (paidAmount < 0) {
      throw new Error('Paid amount cannot be negative');
    }
    if (paidAmount > totalAmount) {
      throw new Error('Paid amount cannot exceed total amount');
    }

    const finalInvoiceNumber = invoiceNumber || `INV-${Date.now()}`;
    const isFinalized = paidAmount >= totalAmount;

    const itemIds = cartItems
      .map((item) => item.itemId)
      .filter(Boolean)
      .map((id) => id.toString());

    const items = itemIds.length
      ? await repository.find('items', { _id: { $in: itemIds } })
      : [];
    const itemMap = new Map(
      items.map((item) => [item._id.toString(), item.toObject()]),
    );

    const groupIds = items
      .map((item) => item.groupId)
      .filter(Boolean)
      .map((id) => id.toString());
    const groups = groupIds.length
      ? await repository.find('itemgroups', { _id: { $in: groupIds } })
      : [];
    const groupMap = new Map(
      groups.map((group) => [group._id.toString(), group.name]),
    );

    const invoiceProducts = cartItems.map((item) => {
      const itemDoc = itemMap.get(item.itemId?.toString());
      const groupName = itemDoc?.groupId
        ? groupMap.get(itemDoc.groupId.toString()) || ''
        : '';

      return {
        productId: item.itemId,
        itemName: item.itemNameSnapshot,
        quantity: item.quantity,
        costPerUnit: item.unitPriceSnapshot,
        itemGroup: groupName,
      };
    });

    const invoice = await repository.create('invoices', {
      clientId,
      clientCustomerId,
      clientCustomerName: nameToUse,
      clientCustomerPhone: phoneToUse,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate,
      dueDate,
      subtotal: totalFromCart,
      totalTax,
      totalDiscount,
      totalAmount,
      paidAmount,
      products: invoiceProducts,
      notes,
      isFinalized,
    });

    // Update stock for each item captured on the cart (bulk operation)
    const stockUpdates = cartItems
      .filter((cartItem) => cartItem.itemId)
      .map((cartItem) => ({
        updateOne: {
          filter: {
            _id: cartItem.itemId,
            clientId,
            stock: { $gte: cartItem.quantity },
          },
          update: { $inc: { stock: -cartItem.quantity } },
        },
      }));

    if (stockUpdates.length > 0) {
      await repository.bulkWrite('items', stockUpdates);
    }

    // Record initial payment if any
    if (paidAmount > 0) {
      await repository.create('payments', {
        clientId,
        invoiceId: invoice._id,
        amount: paidAmount,
        method: 'cash',
        note: 'Payment at invoice generation',
      });
    }

    // Create purchase history when finalized and clientCustomer is present
    if (isFinalized && clientCustomerId) {
      await repository.create('purchasehistories', {
        clientId,
        clientCustomerId,
        clientCustomerPhone: phoneToUse || '',
        invoiceId: invoice._id,
        totalAmount,
      });
    }

    // Clear cart after invoice generation
    await clearCart(clientId, cartId);

    const invoiceWithProducts = await buildInvoiceWithProductDetails(invoice);

    return { success: true, invoice: invoiceWithProducts };
  } catch (error) {
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
};

export const generateInvoiceWithProduct = async (clientId, invoiceData) => {
  try {
    const {
      products,
      clientCustomerId: providedclientCustomerId,
      clientCustomerName,
      clientCustomerPhone,
      customerPhone,
      invoiceNumber,
      invoiceDate,
      dueDate,
      subtotal: providedSubtotal,
      totalAmount: providedTotalAmount,
      totalTax = 0,
      totalDiscount = 0,
      paidAmount: providedPaidAmount = 0,
      notes = '',
    } = invoiceData;

    if (!products || !products.length) {
      throw new Error('Products array is required and cannot be empty');
    }

    for (const product of products) {
      if (!product.productId) {
        throw new Error('Each product must include productId');
      }
      if (!product.quantity || product.quantity <= 0) {
        throw new Error('Each product must include quantity greater than 0');
      }
    }

    const { clientCustomerId, nameToUse, phoneToUse } =
      await resolveClientCustomerForInvoice({
        clientId,
        providedclientCustomerId,
        clientCustomerName,
        clientCustomerPhone,
        customerPhone,
      });

    const productIds = products
      .map((product) => product.productId)
      .filter(Boolean)
      .map((id) => id.toString());

    const items = productIds.length
      ? await repository.find('items', { _id: { $in: productIds } })
      : [];
    const itemMap = new Map(
      items.map((item) => [item._id.toString(), item.toObject()]),
    );

    const groupIds = items
      .map((item) => item.groupId)
      .filter(Boolean)
      .map((id) => id.toString());
    const groups = groupIds.length
      ? await repository.find('itemgroups', { _id: { $in: groupIds } })
      : [];
    const groupMap = new Map(
      groups.map((group) => [group._id.toString(), group.name]),
    );

    const invoiceProducts = products.map((product) => {
      const itemDoc = itemMap.get(product.productId.toString());
      if (!itemDoc) {
        throw new Error('Product not found');
      }
      const groupName = itemDoc?.groupId
        ? groupMap.get(itemDoc.groupId.toString()) || ''
        : '';

      return {
        productId: product.productId,
        itemName: itemDoc?.name || 'Unknown Item',
        quantity: product.quantity,
        costPerUnit: itemDoc?.price ?? 0,
        itemGroup: groupName,
      };
    });

    const calculatedSubtotal = invoiceProducts.reduce(
      (sum, product) => sum + product.costPerUnit * product.quantity,
      0,
    );
    const subtotal =
      typeof providedSubtotal === 'number'
        ? providedSubtotal
        : calculatedSubtotal;
    const totalAmount =
      typeof providedTotalAmount === 'number'
        ? providedTotalAmount
        : subtotal + totalTax - totalDiscount;
    const paidAmount =
      typeof providedPaidAmount === 'number' ? providedPaidAmount : 0;

    if (paidAmount < 0) {
      throw new Error('Paid amount cannot be negative');
    }
    if (paidAmount > totalAmount) {
      throw new Error('Paid amount cannot exceed total amount');
    }

    const finalInvoiceNumber = invoiceNumber || `INV-${Date.now()}`;
    const isFinalized = paidAmount >= totalAmount;

    const invoice = await repository.create('invoices', {
      clientId,
      clientCustomerId,
      clientCustomerName: nameToUse,
      clientCustomerPhone: phoneToUse,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate,
      dueDate,
      subtotal,
      totalTax,
      totalDiscount,
      totalAmount,
      paidAmount,
      products: invoiceProducts,
      notes,
      isFinalized,
    });

    // Update stock for all products in a single operation (avoids N+1 queries)
    const stockUpdates = products
      .filter((product) => product.productId)
      .map((product) => ({
        updateOne: {
          filter: {
            _id: product.productId,
            clientId,
            stock: { $gte: product.quantity },
          },
          update: { $inc: { stock: -product.quantity } },
        },
      }));
    if (stockUpdates.length > 0) {
      await repository.bulkWrite('items', stockUpdates);
    }

    // Record initial payment if any
    if (paidAmount > 0) {
      await repository.create('payments', {
        clientId,
        invoiceId: invoice._id,
        amount: paidAmount,
        method: 'cash',
        note: 'Payment at invoice generation',
      });
    }

    // Create purchase history when finalized and clientCustomer is present
    if (isFinalized && clientCustomerId) {
      await repository.create('purchasehistories', {
        clientId,
        clientCustomerId,
        clientCustomerPhone: phoneToUse || '',
        invoiceId: invoice._id,
        totalAmount,
      });
    }

    const invoiceWithProducts = await buildInvoiceWithProductDetails(invoice);

    return { success: true, invoice: invoiceWithProducts };
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
  note = '',
) => {
  try {
    if (amount <= 0) throw new Error('Payment amount must be positive');

    const invoice = await repository.findOne('invoices', { _id: invoiceId, clientId });
    if (!invoice) throw new Error('Invoice not found');

    const remaining = invoice.totalAmount - invoice.paidAmount;
    if (amount > remaining) {
      throw new Error('Payment exceeds outstanding balance');
    }

    const payment = await repository.create('payments', {
      clientId,
      invoiceId,
      amount,
      method,
      note,
    });

    invoice.paidAmount += amount;
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.isFinalized = true;

      if (invoice.clientCustomerId) {
        const existingHistory = await repository.findOne('purchasehistories', {
          invoiceId: invoice._id,
        });
        if (!existingHistory) {
          const customerDoc = await repository.findById(
            'clientcustomers',
            invoice.clientCustomerId,
          );
          await repository.create('purchasehistories', {
            clientId,
            clientCustomerId: invoice.clientCustomerId,
            clientCustomerPhone: customerDoc?.phoneNumber || '',
            invoiceId: invoice._id,
            totalAmount: invoice.totalAmount,
          });
        }
      }
    }

    await repository.updateById('invoices', invoice._id, {
      paidAmount: invoice.paidAmount,
      isFinalized: invoice.isFinalized,
    });

    const invoiceWithProducts = await buildInvoiceWithProductDetails(invoice);

    return { success: true, payment, invoice: invoiceWithProducts };
  } catch (error) {
    throw new Error(`Failed to record payment: ${error.message}`);
  }
};

export const getPaymentsForInvoice = async (clientId, invoiceId) => {
  try {
    const payments = await repository.find('payments', { invoiceId, clientId });
    return { success: true, payments };
  } catch (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }
};

export const getPendingInvoicesByClientCustomer = async (
  clientId,
  clientCustomerId,
  clientCustomerPhone = null,
) => {
  try {
    const filter = { clientId, isFinalized: false };
    if (clientCustomerId) {
      filter.clientCustomerId = clientCustomerId;
    }
    if (clientCustomerPhone) {
      filter.clientCustomerPhone = clientCustomerPhone;
    }
    const rawInvoices = await repository.find('invoices', filter, null, { populate: 'clientCustomerId' });
    const invoicesWithProducts = await Promise.all(
      rawInvoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );
    const pendingInvoices = invoicesWithProducts.map((invoice) => {
      const pendingAmount = Math.max(
        (invoice.totalAmount || 0) - (invoice.paidAmount || 0),
        0,
      );
      return { ...invoice, pendingAmount };
    });

    return { success: true, pendingInvoices };
  } catch (error) {
    throw new Error(
      `Failed to fetch pending invoices by clientCustomer: ${error.message}`,
    );
  }
};

export const getPaidInvoicesByClientCustomer = async (
  clientId,
  clientCustomerId,
  clientCustomerPhone = null,
) => {
  try {
    const filter = { clientId, isFinalized: true };
    if (clientCustomerId) {
      filter.clientCustomerId = clientCustomerId;
    }
    if (clientCustomerPhone) {
      filter.clientCustomerPhone = clientCustomerPhone;
    }
    const invoices = await repository.find('invoices', filter, null, { populate: 'clientCustomerId' });
    const invoicesWithProducts = await Promise.all(
      invoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );

    return { success: true, invoices: invoicesWithProducts };
  } catch (error) {
    throw new Error(
      `Failed to fetch paid invoices by clientCustomer: ${error.message}`,
    );
  }
};

export const getInvoices = async (clientId) => {
  try {
    const invoices = await repository.find('invoices', { clientId }, null, {
      populate: 'clientCustomerId',
    });
    const invoicesWithProducts = await Promise.all(
      invoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );

    return { success: true, invoices: invoicesWithProducts };
  } catch (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }
};

export const getPendingInvoices = async (clientId) => {
  try {
    const rawInvoices = await repository.find('invoices', { clientId, isFinalized: false });
    const invoicesWithProducts = await Promise.all(
      rawInvoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );
    const pendingInvoices = invoicesWithProducts.map((invoice) => {
      const pendingAmount = Math.max(
        (invoice.totalAmount || 0) - (invoice.paidAmount || 0),
        0,
      );
      return { ...invoice, pendingAmount };
    });

    return { success: true, pendingInvoices };
  } catch (error) {
    throw new Error(`Failed to fetch pending invoices: ${error.message}`);
  }
};

export const getPaymentReport = async (clientId) => {
  try {
    const invoices = await repository.find('invoices', { clientId });
    const summary = invoices.reduce(
      (acc, invoice) => {
        acc.totalInvoices += 1;
        acc.totalAmount += invoice.totalAmount;
        acc.totalPaid += invoice.paidAmount;
        return acc;
      },
      { totalInvoices: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
    );
    summary.totalPending = summary.totalAmount - summary.totalPaid;
    const invoicesWithProducts = await Promise.all(
      invoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );

    return { success: true, report: invoicesWithProducts, summary };
  } catch (error) {
    throw new Error(`Failed to fetch payment report: ${error.message}`);
  }
};

export const getPurchaseHistory = async (
  clientId,
  clientCustomerId = null,
  clientCustomerPhone = null,
) => {
  try {
    const filter = { clientId };
    if (clientCustomerId) {
      filter.clientCustomerId = clientCustomerId;
    }
    if (clientCustomerPhone) {
      filter.clientCustomerPhone = clientCustomerPhone;
    }
    const purchaseHistory = await repository.find('purchasehistories', filter, null, {
      populate: ['clientCustomerId', 'invoiceId'],
    });
    return { success: true, purchaseHistory };
  } catch (error) {
    throw new Error(`Failed to fetch purchase history: ${error.message}`);
  }
};

// ============================================================================
// SYNC SERVICES (Offline → Online)
// ============================================================================
export const syncClientData = async (clientId, payload = {}) => {
  const session = await mongoose.startSession();
  const summary = {
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsDeleted: 0,
    invoicesCreated: 0,
    paymentsCreated: 0,
  };
  const synced = {
    itemsCreated: [],
    itemsUpdated: [],
    itemsDeleted: [],
    invoicesCreated: [],
    paymentsCreated: [],
  };

  try {
    const itemOps = payload.item || {};
    const invoiceOps = payload.invoice || {};
    const paymentOps = payload.payment || {};

    const itemCreates = Array.isArray(itemOps.create) ? itemOps.create : [];
    const itemUpdates = Array.isArray(itemOps.update) ? itemOps.update : [];
    const itemDeletes = Array.isArray(itemOps.delete) ? itemOps.delete : [];

    const invoiceCreates = Array.isArray(invoiceOps.create)
      ? invoiceOps.create
      : [];
    const paymentCreates = Array.isArray(paymentOps.create)
      ? paymentOps.create
      : [];

    const runSyncOperations = async () => {
      if (itemCreates.length) {
        const preparedItems = itemCreates.map((item, index) => {
          if (!item?.name || item.price === undefined) {
            throw new Error(
              `Item create at index ${index} is missing name/price`,
            );
          }
          const sanitized = { ...item };
          delete sanitized._id;
          return {
            ...sanitized,
            clientId,
          };
        });
        const createdItems = await repository.bulkCreate('items', preparedItems, { session });
        summary.itemsCreated += createdItems.length;
        synced.itemsCreated.push(
          ...createdItems.map((item) => item._id.toString()),
        );
      }

      if (itemUpdates.length) {
        for (const item of itemUpdates) {
          const { _id, ...updateData } = item || {};
          if (!_id) {
            throw new Error('Item update requires _id');
          }
          const updated = await repository.updateOne(
            'items',
            { _id, clientId },
            { ...updateData, updatedAt: new Date() },
            { new: true, session },
          );
          if (!updated) {
            throw new Error(`Item not found for update: ${_id}`);
          }
          summary.itemsUpdated += 1;
          synced.itemsUpdated.push(_id.toString());
        }
      }

      if (itemDeletes.length) {
        for (const itemId of itemDeletes) {
          if (!itemId) continue;
          const deleted = await repository.updateOne(
            'items',
            { _id: itemId, clientId },
            { isActive: false, updatedAt: new Date() },
            { new: true, session },
          );
          if (!deleted) {
            throw new Error(`Item not found for delete: ${itemId}`);
          }
          summary.itemsDeleted += 1;
          synced.itemsDeleted.push(itemId.toString());
        }
      }

      if (invoiceCreates.length) {
        for (const [index, invoice] of invoiceCreates.entries()) {
          if (!invoice?.products || !Array.isArray(invoice.products)) {
            throw new Error(
              `Invoice create at index ${index} missing products`,
            );
          }

          const normalizedProducts = [];

          for (const [productIndex, product] of invoice.products.entries()) {
            if (product?.quantity === undefined) {
              throw new Error(
                `Invoice product at index ${productIndex} missing quantity`,
              );
            }
            if (product.quantity <= 0) {
              throw new Error(
                `Invoice product at index ${productIndex} must have quantity > 0`,
              );
            }

            let resolvedProductId = product.productId;

            if (!resolvedProductId) {
              if (!product?.itemName) {
                throw new Error(
                  `Invoice product at index ${productIndex} missing itemName`,
                );
              }
              if (product.costPerUnit === undefined) {
                throw new Error(
                  `Invoice product at index ${productIndex} missing costPerUnit`,
                );
              }

              const createdItem = await repository.bulkCreate(
                'items',
                [
                  {
                    clientId,
                    name: product.itemName,
                    price: product.costPerUnit,
                    stock: product.stock !== undefined ? product.stock : 0,
                    unit: product.unit || 'nos',
                    description: product.description || '',
                  },
                ],
                { session },
              );

              const created = createdItem[0];
              resolvedProductId = created._id;
              summary.itemsCreated += 1;
              synced.itemsCreated.push(created._id.toString());
            }

            normalizedProducts.push({
              productId: resolvedProductId,
              itemName: product.itemName || 'Unknown Item',
              itemGroup: product.itemGroup || '',
              quantity: product.quantity,
              costPerUnit:
                product.costPerUnit !== undefined ? product.costPerUnit : 0,
            });
          }

          const subtotalCalculated = normalizedProducts.reduce(
            (sum, product) => sum + product.costPerUnit * product.quantity,
            0,
          );
          const subtotal =
            invoice.subtotal !== undefined
              ? invoice.subtotal
              : subtotalCalculated;
          const totalTax = invoice.totalTax || 0;
          const totalDiscount = invoice.totalDiscount || 0;
          const totalAmount =
            invoice.totalAmount !== undefined
              ? invoice.totalAmount
              : subtotal + totalTax - totalDiscount;
          const paidAmount = invoice.paidAmount || 0;
          const isFinalized = paidAmount >= totalAmount;

          if (paidAmount < 0) {
            throw new Error('Paid amount cannot be negative');
          }
          if (paidAmount > totalAmount) {
            throw new Error('Paid amount cannot exceed total amount');
          }

          const invoiceDoc = await repository.bulkCreate(
            'invoices',
            [
              {
                clientId,
                clientCustomerId: invoice.clientCustomerId || null,
                clientCustomerName: invoice.clientCustomerName || '',
                clientCustomerPhone: invoice.clientCustomerPhone || '',
                invoiceNumber:
                  invoice.invoiceNumber || `INV-${Date.now()}-${index}`,
                invoiceDate: invoice.invoiceDate,
                dueDate: invoice.dueDate,
                subtotal,
                totalTax,
                totalDiscount,
                totalAmount,
                paidAmount,
                products: normalizedProducts,
                notes: invoice.notes || '',
                isFinalized,
              },
            ],
            { session },
          );

          const createdInvoice = invoiceDoc[0];
          summary.invoicesCreated += 1;
          synced.invoicesCreated.push(createdInvoice._id.toString());

          for (const product of normalizedProducts) {
            if (product.productId) {
              await repository.updateOne(
                'items',
                {
                  _id: product.productId,
                  clientId,
                  stock: { $gte: product.quantity },
                },
                { $inc: { stock: -product.quantity } },
                { session },
              );
            }
          }

          if (isFinalized && createdInvoice.clientCustomerId) {
            await repository.bulkCreate(
              'purchasehistories',
              [
                {
                  clientId,
                  clientCustomerId: createdInvoice.clientCustomerId,
                  clientCustomerPhone: createdInvoice.clientCustomerPhone || '',
                  invoiceId: createdInvoice._id,
                  totalAmount: createdInvoice.totalAmount,
                },
              ],
              { session },
            );
          }
        }
      }

      if (paymentCreates.length) {
        for (const [index, payment] of paymentCreates.entries()) {
          if (!payment?.invoiceId || payment.amount === undefined) {
            throw new Error(`Payment create at index ${index} missing data`);
          }
          if (payment.amount <= 0) {
            throw new Error(
              `Payment create at index ${index} must have amount > 0`,
            );
          }

          const invoiceDoc = await repository.findOne(
            'invoices',
            { _id: payment.invoiceId, clientId },
            null,
            { session },
          );
          if (!invoiceDoc) {
            throw new Error(
              `Invoice not found for payment: ${payment.invoiceId}`,
            );
          }

          const remaining = invoiceDoc.totalAmount - invoiceDoc.paidAmount;
          if (payment.amount > remaining) {
            throw new Error('Payment exceeds outstanding balance');
          }

          const createdPayments = await repository.bulkCreate(
            'payments',
            [
              {
                clientId,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                method: payment.method || 'cash',
                note: payment.note || '',
                paidAt: parseDateValue(payment.paidAt || payment.time),
              },
            ],
            { session },
          );
          if (createdPayments?.length) {
            synced.paymentsCreated.push(createdPayments[0]._id.toString());
          }

          invoiceDoc.paidAmount += payment.amount;
          if (invoiceDoc.paidAmount >= invoiceDoc.totalAmount) {
            invoiceDoc.isFinalized = true;
          }
          await repository.updateById(
            'invoices',
            invoiceDoc._id,
            {
              paidAmount: invoiceDoc.paidAmount,
              isFinalized: invoiceDoc.isFinalized,
            },
            { session },
          );

          if (invoiceDoc.isFinalized && invoiceDoc.clientCustomerId) {
            const existingHistory = await repository.findOne(
              'purchasehistories',
              { invoiceId: invoiceDoc._id },
              null,
              { session },
            );
            if (!existingHistory) {
              await repository.bulkCreate(
                'purchasehistories',
                [
                  {
                    clientId,
                    clientCustomerId: invoiceDoc.clientCustomerId,
                    clientCustomerPhone: invoiceDoc.clientCustomerPhone || '',
                    invoiceId: invoiceDoc._id,
                    totalAmount: invoiceDoc.totalAmount,
                  },
                ],
                { session },
              );
            }
          }

          summary.paymentsCreated += 1;
        }
      }
    };

    try {
      await session.withTransaction(runSyncOperations);
    } catch (error) {
      if (
        error.message &&
        error.message.includes(
          'Transaction numbers are only allowed on a replica set member or mongos',
        )
      ) {
        await runSyncOperations();
      } else {
        throw error;
      }
    }

    const fullData = await getFullClientData(clientId);

    return {
      success: true,
      message: 'Sync completed successfully',
      summary,
      synced,
      data: fullData,
    };
  } catch (error) {
    throw new Error(`Failed to sync data: ${error.message}`);
  } finally {
    session.endSession();
  }
};

// ============================================================================
// INVOICE HISTORY WITH ANALYTICS (SPECIFIC CUSTOMER)
// ============================================================================
export const getInvoiceHistory = async (
  clientId,
  clientCustomerId,
  options = {},
) => {
  try {
    const {
      startDate,
      endDate,
      status = 'all',
      limit = 100,
      offset = 0,
    } = options;

    // Validate client customer exists
    const customer = await repository.findOne('clientcustomers', {
      _id: clientCustomerId,
      clientId,
    });
    if (!customer) {
      throw new Error('Client customer not found');
    }

    // Validate date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new Error('Invalid date range: startDate must be before endDate');
      }
    }

    // Build filter
    const filter = { clientId, clientCustomerId };

    if (startDate || endDate) {
      filter.generatedAt = {};
      if (startDate) filter.generatedAt.$gte = new Date(startDate);
      if (endDate) filter.generatedAt.$lte = new Date(endDate);
    }

    if (status === 'finalized') {
      filter.isFinalized = true;
    } else if (status === 'pending') {
      filter.isFinalized = false;
    }

    // Get invoices with pagination
    const totalCount = await repository.count('invoices', filter);
    const rawInvoices = await repository.find('invoices', filter, null, {
      sort: { generatedAt: -1 },
      skip: offset,
      limit: limit,
    });

    // Get all invoices for analytics (without pagination)
    const allInvoices = await repository.find('invoices', {
      clientId,
      clientCustomerId,
      ...(startDate || endDate ? { generatedAt: filter.generatedAt } : {}),
    });

    // Get payments for all invoices
    const invoiceIds = allInvoices.map((inv) => inv._id);
    const payments = await repository.find('payments', { invoiceId: { $in: invoiceIds } });

    // Build invoice data with payment details
    const invoicesWithDetails = await Promise.all(
      rawInvoices.map(async (invoice) => {
        const invoicePayments = payments.filter(
          (p) => p.invoiceId.toString() === invoice._id.toString(),
        );

        const paymentCount = invoicePayments.length;
        const firstPaymentDate =
          invoicePayments.length > 0
            ? invoicePayments.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
              )[0].createdAt
            : null;
        const lastPaymentDate =
          invoicePayments.length > 0
            ? invoicePayments.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
              )[0].createdAt
            : null;

        const daysToFullPayment =
          invoice.isFinalized && lastPaymentDate
            ? Math.floor(
                (new Date(lastPaymentDate) - new Date(invoice.generatedAt)) /
                  (1000 * 60 * 60 * 24),
              )
            : null;

        const invoiceWithProducts =
          await buildInvoiceWithProductDetails(invoice);

        return {
          ...invoiceWithProducts,
          pendingAmount: Math.max(invoice.totalAmount - invoice.paidAmount, 0),
          paymentStatus: invoice.isFinalized
            ? 'paid'
            : invoice.paidAmount > 0
              ? 'partial'
              : 'unpaid',
          paymentCount,
          firstPaymentDate,
          lastPaymentDate,
          daysToFullPayment,
        };
      }),
    );

    // Calculate analytics
    const analytics = calculateInvoiceAnalytics(
      allInvoices,
      payments,
      customer,
    );

    return {
      success: true,
      data: {
        clientCustomer: {
          _id: customer._id,
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          emailId: customer.emailId || '',
          address: customer.address || '',
          gstNo: customer.gstNo || '',
        },
        invoices: invoicesWithDetails,
        analytics,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch invoice history: ${error.message}`);
  }
};

const calculateInvoiceAnalytics = (invoices, payments, customer) => {
  const finalizedInvoices = invoices.filter((inv) => inv.isFinalized);
  const pendingInvoices = invoices.filter((inv) => !inv.isFinalized);

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalPending = totalRevenue - totalPaid;

  // Payment behavior
  const invoicesWithPayments = invoices.filter((inv) => inv.paidAmount > 0);
  let totalDaysToPayment = 0;
  let onTimeCount = 0;
  let partialPaymentCount = 0;

  invoicesWithPayments.forEach((inv) => {
    const invPayments = payments.filter(
      (p) => p.invoiceId.toString() === inv._id.toString(),
    );
    if (invPayments.length > 0) {
      if (inv.isFinalized) {
        const lastPayment = invPayments.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )[0];
        const days = Math.floor(
          (new Date(lastPayment.createdAt) - new Date(inv.generatedAt)) /
            (1000 * 60 * 60 * 24),
        );
        totalDaysToPayment += days;
        if (days <= 7) onTimeCount++;
      }
      if (
        invPayments.length > 1 ||
        (invPayments.length === 1 && !inv.isFinalized)
      ) {
        partialPaymentCount++;
      }
    }
  });

  const averagePaymentTime =
    finalizedInvoices.length > 0
      ? totalDaysToPayment / finalizedInvoices.length
      : 0;

  // Payment method preference
  const paymentMethodCounts = {};
  payments.forEach((p) => {
    paymentMethodCounts[p.method] = (paymentMethodCounts[p.method] || 0) + 1;
  });

  // Purchase patterns
  const itemPurchases = {};
  const groupPurchases = {};
  let totalItemCount = 0;
  let totalQuantity = 0;

  invoices.forEach((inv) => {
    inv.products.forEach((product) => {
      totalItemCount++;
      totalQuantity += product.quantity;

      const itemKey = product.itemName;
      if (!itemPurchases[itemKey]) {
        itemPurchases[itemKey] = {
          itemName: product.itemName,
          itemGroup: product.itemGroup || 'Uncategorized',
          totalQuantity: 0,
          totalRevenue: 0,
          purchaseCount: 0,
        };
      }
      itemPurchases[itemKey].totalQuantity += product.quantity;
      itemPurchases[itemKey].totalRevenue +=
        product.quantity * product.costPerUnit;
      itemPurchases[itemKey].purchaseCount++;

      const groupKey = product.itemGroup || 'Uncategorized';
      if (!groupPurchases[groupKey]) {
        groupPurchases[groupKey] = {
          groupName: groupKey,
          invoiceCount: 0,
          totalRevenue: 0,
        };
      }
      groupPurchases[groupKey].totalRevenue +=
        product.quantity * product.costPerUnit;
    });

    const uniqueGroups = [
      ...new Set(inv.products.map((p) => p.itemGroup || 'Uncategorized')),
    ];
    uniqueGroups.forEach((group) => {
      if (groupPurchases[group]) {
        groupPurchases[group].invoiceCount++;
      }
    });
  });

  const frequentlyPurchasedItems = Object.values(itemPurchases)
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 10);

  const preferredItemGroups = Object.values(groupPurchases)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  // Timeline
  const sortedInvoices = invoices.sort(
    (a, b) => new Date(a.generatedAt) - new Date(b.generatedAt),
  );
  const firstInvoiceDate =
    sortedInvoices.length > 0 ? sortedInvoices[0].generatedAt : null;
  const lastInvoiceDate =
    sortedInvoices.length > 0
      ? sortedInvoices[sortedInvoices.length - 1].generatedAt
      : null;

  const customerTenure = firstInvoiceDate
    ? Math.floor(
        (new Date() - new Date(firstInvoiceDate)) / (1000 * 60 * 60 * 24),
      )
    : 0;

  const averageDaysBetweenPurchases =
    invoices.length > 1 ? customerTenure / (invoices.length - 1) : 0;

  const monthlyPurchaseFrequency =
    customerTenure > 0 ? (invoices.length / customerTenure) * 30 : 0;

  // Trends - monthly revenue
  const monthlyRevenueMap = {};
  invoices.forEach((inv) => {
    const date = new Date(inv.generatedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyRevenueMap[monthKey]) {
      monthlyRevenueMap[monthKey] = {
        month: monthKey,
        revenue: 0,
        invoiceCount: 0,
      };
    }
    monthlyRevenueMap[monthKey].revenue += inv.totalAmount;
    monthlyRevenueMap[monthKey].invoiceCount++;
  });

  const monthlyRevenue = Object.values(monthlyRevenueMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const revenueGrowthRate =
    monthlyRevenue.length >= 2
      ? (monthlyRevenue[monthlyRevenue.length - 1].revenue -
          monthlyRevenue[monthlyRevenue.length - 2].revenue) /
        monthlyRevenue[monthlyRevenue.length - 2].revenue
      : 0;

  const purchaseFrequencyTrend =
    monthlyRevenue.length >= 2
      ? monthlyRevenue[monthlyRevenue.length - 1].invoiceCount >
        monthlyRevenue[monthlyRevenue.length - 2].invoiceCount
        ? 'increasing'
        : monthlyRevenue[monthlyRevenue.length - 1].invoiceCount <
            monthlyRevenue[monthlyRevenue.length - 2].invoiceCount
          ? 'decreasing'
          : 'stable'
      : 'stable';

  return {
    summary: {
      totalInvoices: invoices.length,
      finalizedInvoices: finalizedInvoices.length,
      pendingInvoices: pendingInvoices.length,
      totalRevenue,
      totalPaid,
      totalPending,
      averageInvoiceValue:
        invoices.length > 0 ? totalRevenue / invoices.length : 0,
      averagePaymentTime,
      customerLifetimeValue: totalRevenue,
    },
    paymentBehavior: {
      onTimePaymentRate:
        finalizedInvoices.length > 0
          ? onTimeCount / finalizedInvoices.length
          : 0,
      averageDaysToPayment: averagePaymentTime,
      partialPaymentFrequency:
        invoices.length > 0 ? partialPaymentCount / invoices.length : 0,
      paymentMethodPreference: paymentMethodCounts,
    },
    purchasePatterns: {
      frequentlyPurchasedItems,
      preferredItemGroups,
      averageItemsPerInvoice:
        invoices.length > 0 ? totalItemCount / invoices.length : 0,
      averageQuantityPerInvoice:
        invoices.length > 0 ? totalQuantity / invoices.length : 0,
    },
    timeline: {
      firstInvoiceDate,
      lastInvoiceDate,
      customerTenure,
      averageDaysBetweenPurchases,
      monthlyPurchaseFrequency,
    },
    trends: {
      monthlyRevenue,
      revenueGrowthRate,
      purchaseFrequencyTrend,
    },
  };
};

// ============================================================================
// PAYMENT HISTORY WITH ANALYTICS (SPECIFIC INVOICE)
// ============================================================================
export const getPaymentHistory = async (clientId, invoiceId) => {
  try {
    // Get invoice
    const invoice = await repository.findOne('invoices',
      {
        _id: invoiceId,
        clientId,
      },
      null,
      { populate: 'clientCustomerId' },
    );
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get all payments for this invoice
    const payments = await repository.find('payments', { invoiceId, clientId }, null, {
      sort: { createdAt: 1 },
    });

    // Build payment details with cumulative info
    const paymentsWithDetails = payments.map((payment, index) => {
      const previousPayments = payments.slice(0, index);
      const cumulativeAmount =
        previousPayments.reduce((sum, p) => sum + p.amount, 0) + payment.amount;
      const remainingBalance = invoice.totalAmount - cumulativeAmount;
      const percentagePaid = (cumulativeAmount / invoice.totalAmount) * 100;
      const daysFromInvoice = Math.floor(
        (new Date(payment.createdAt) - new Date(invoice.generatedAt)) /
          (1000 * 60 * 60 * 24),
      );

      return {
        _id: payment._id,
        clientId: payment.clientId,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        method: payment.method,
        note: payment.note || '',
        paymentNumber: index + 1,
        cumulativeAmount,
        remainingBalance: Math.max(remainingBalance, 0),
        percentagePaid: Math.min(percentagePaid, 100),
        daysFromInvoice,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };
    });

    // Calculate analytics
    const analytics = calculatePaymentAnalytics(invoice, payments);

    // Build invoice data
    const invoiceWithProducts = await buildInvoiceWithProductDetails(invoice);

    return {
      success: true,
      data: {
        invoice: {
          ...invoiceWithProducts,
          clientCustomerId: {
            _id: invoice.clientCustomerId._id,
            name: invoice.clientCustomerId.name,
            phoneNumber: invoice.clientCustomerId.phoneNumber,
          },
        },
        payments: paymentsWithDetails,
        analytics,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch payment history: ${error.message}`);
  }
};

const calculatePaymentAnalytics = (invoice, payments) => {
  const totalPayments = payments.length;
  const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(invoice.totalAmount - totalAmountPaid, 0);
  const paymentCompletionRate = (totalAmountPaid / invoice.totalAmount) * 100;
  const isFullyPaid = invoice.isFinalized;
  const isPending = !invoice.isFinalized;

  // Payment timeline
  const sortedPayments = payments.sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  const firstPaymentDate =
    sortedPayments.length > 0 ? sortedPayments[0].createdAt : null;
  const lastPaymentDate =
    sortedPayments.length > 0
      ? sortedPayments[sortedPayments.length - 1].createdAt
      : null;
  const finalizedDate = invoice.isFinalized ? lastPaymentDate : null;

  const daysToFirstPayment = firstPaymentDate
    ? Math.floor(
        (new Date(firstPaymentDate) - new Date(invoice.generatedAt)) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const daysToFullPayment = finalizedDate
    ? Math.floor(
        (new Date(finalizedDate) - new Date(invoice.generatedAt)) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const totalPaymentDuration =
    firstPaymentDate && lastPaymentDate
      ? Math.floor(
          (new Date(lastPaymentDate) - new Date(firstPaymentDate)) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  const averageDaysBetweenPayments =
    payments.length > 1 ? totalPaymentDuration / (payments.length - 1) : 0;

  // Payment method breakdown
  const paymentMethodBreakdown = {};
  payments.forEach((p) => {
    if (!paymentMethodBreakdown[p.method]) {
      paymentMethodBreakdown[p.method] = {
        count: 0,
        totalAmount: 0,
        percentage: 0,
      };
    }
    paymentMethodBreakdown[p.method].count++;
    paymentMethodBreakdown[p.method].totalAmount += p.amount;
  });

  Object.keys(paymentMethodBreakdown).forEach((method) => {
    paymentMethodBreakdown[method].percentage =
      (paymentMethodBreakdown[method].totalAmount / totalAmountPaid) * 100;
  });

  // Payment pattern
  const averagePaymentSize =
    payments.length > 0 ? totalAmountPaid / payments.length : 0;
  const sortedByAmount = [...payments].sort((a, b) => b.amount - a.amount);
  const largestPayment =
    sortedByAmount.length > 0
      ? {
          amount: sortedByAmount[0].amount,
          method: sortedByAmount[0].method,
          date: sortedByAmount[0].createdAt,
        }
      : null;
  const smallestPayment =
    sortedByAmount.length > 0
      ? {
          amount: sortedByAmount[sortedByAmount.length - 1].amount,
          method: sortedByAmount[sortedByAmount.length - 1].method,
          date: sortedByAmount[sortedByAmount.length - 1].createdAt,
        }
      : null;

  const initialPaymentPercentage =
    payments.length > 0 ? (payments[0].amount / invoice.totalAmount) * 100 : 0;

  const paymentFrequency =
    payments.length === 0
      ? 'none'
      : payments.length === 1
        ? 'single'
        : 'multiple';

  const isPartialPayment =
    payments.length > 1 || (payments.length === 1 && !invoice.isFinalized);

  // Milestones
  const milestones = [
    {
      date: invoice.generatedAt,
      event: 'Invoice Generated',
      amount: invoice.totalAmount,
      balance: invoice.totalAmount,
    },
  ];

  let cumulativeAmount = 0;
  payments.forEach((payment, index) => {
    cumulativeAmount += payment.amount;
    const event =
      index === 0
        ? 'First Payment Received'
        : cumulativeAmount >= invoice.totalAmount
          ? 'Invoice Finalized'
          : 'Payment Received';
    milestones.push({
      date: payment.createdAt,
      event,
      amount: payment.amount,
      balance: Math.max(invoice.totalAmount - cumulativeAmount, 0),
      method: payment.method,
    });
  });

  // Insights
  let paymentBehavior = 'no_payment';
  let creditRisk = 'pending_assessment';
  const recommendations = [];

  if (payments.length > 0) {
    if (daysToFullPayment !== null) {
      if (daysToFullPayment <= 7) {
        paymentBehavior = 'prompt';
        creditRisk = 'low';
        recommendations.push('Customer demonstrates reliable payment behavior');
        recommendations.push(
          'Consider offering credit terms for future purchases',
        );
      } else if (daysToFullPayment <= 30) {
        paymentBehavior = 'delayed';
        creditRisk = 'medium';
        recommendations.push('Monitor future payment timelines closely');
      } else {
        paymentBehavior = 'overdue';
        creditRisk = 'high';
        recommendations.push(
          'Consider requiring upfront payment for future transactions',
        );
      }
    } else if (!invoice.isFinalized) {
      paymentBehavior = 'partial';
      creditRisk = 'medium';
      recommendations.push('Send payment reminder to customer');
      recommendations.push(`Outstanding balance: ₹${remainingBalance}`);
    }

    // Add payment method preference
    const preferredMethod = Object.keys(paymentMethodBreakdown).reduce(
      (a, b) =>
        paymentMethodBreakdown[a].totalAmount >
        paymentMethodBreakdown[b].totalAmount
          ? a
          : b,
    );
    const preferredPercentage =
      paymentMethodBreakdown[preferredMethod].percentage.toFixed(2);
    recommendations.push(
      `Preferred payment method: ${preferredMethod.toUpperCase()} (${preferredPercentage}%)`,
    );
  } else {
    const daysSinceInvoice = Math.floor(
      (new Date() - new Date(invoice.generatedAt)) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceInvoice > 30) {
      paymentBehavior = 'overdue';
      creditRisk = 'high';
    }
    recommendations.push('Send payment reminder to customer');
    recommendations.push('No payment history available for this invoice');
  }

  return {
    paymentSummary: {
      totalPayments,
      totalAmountPaid,
      totalAmountDue: invoice.totalAmount,
      remainingBalance,
      paymentCompletionRate: Math.min(paymentCompletionRate, 100),
      isFullyPaid,
      isPending,
    },
    paymentTimeline: {
      invoiceGeneratedDate: invoice.generatedAt,
      firstPaymentDate,
      lastPaymentDate,
      finalizedDate,
      daysToFirstPayment,
      daysToFullPayment,
      totalPaymentDuration,
      averageDaysBetweenPayments,
    },
    paymentMethodBreakdown,
    paymentPattern: {
      averagePaymentSize,
      largestPayment,
      smallestPayment,
      initialPaymentPercentage,
      paymentFrequency,
      isPartialPayment,
    },
    milestones,
    insights: {
      paymentBehavior,
      creditRisk,
      recommendations,
    },
  };
};

// ============================================================================
// ALL INVOICE HISTORY WITH ANALYTICS (ALL CUSTOMERS)
// ============================================================================
export const getAllInvoiceHistory = async (clientId, options = {}) => {
  try {
    const {
      startDate,
      endDate,
      status = 'all',
      limit = 100,
      offset = 0,
    } = options;

    // Validate date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new Error('Invalid date range: startDate must be before endDate');
      }
    }

    // Build filter
    const filter = { clientId };

    if (startDate || endDate) {
      filter.generatedAt = {};
      if (startDate) filter.generatedAt.$gte = new Date(startDate);
      if (endDate) filter.generatedAt.$lte = new Date(endDate);
    }

    if (status === 'finalized') {
      filter.isFinalized = true;
    } else if (status === 'pending') {
      filter.isFinalized = false;
    }

    // Get invoices with pagination
    const totalCount = await repository.count('invoices', filter);
    const rawInvoices = await repository.find('invoices', filter, null, {
      sort: { generatedAt: -1 },
      skip: offset,
      limit: limit,
    });

    // Get all invoices for analytics (without pagination)
    const allInvoices = await repository.find('invoices', {
      clientId,
      ...(startDate || endDate ? { generatedAt: filter.generatedAt } : {}),
    });

    // Get payments for all invoices
    const invoiceIds = allInvoices.map((inv) => inv._id);
    const payments = await repository.find('payments', { invoiceId: { $in: invoiceIds } });

    // Build invoice data with payment details
    const invoicesWithDetails = await Promise.all(
      rawInvoices.map(async (invoice) => {
        const invoicePayments = payments.filter(
          (p) => p.invoiceId.toString() === invoice._id.toString(),
        );

        const paymentCount = invoicePayments.length;
        const firstPaymentDate =
          invoicePayments.length > 0
            ? invoicePayments.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
              )[0].createdAt
            : null;
        const lastPaymentDate =
          invoicePayments.length > 0
            ? invoicePayments.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
              )[0].createdAt
            : null;

        const daysToFullPayment =
          invoice.isFinalized && lastPaymentDate
            ? Math.floor(
                (new Date(lastPaymentDate) - new Date(invoice.generatedAt)) /
                  (1000 * 60 * 60 * 24),
              )
            : null;

        const invoiceWithProducts =
          await buildInvoiceWithProductDetails(invoice);

        return {
          ...invoiceWithProducts,
          pendingAmount: Math.max(invoice.totalAmount - invoice.paidAmount, 0),
          paymentStatus: invoice.isFinalized
            ? 'paid'
            : invoice.paidAmount > 0
              ? 'partial'
              : 'unpaid',
          paymentCount,
          firstPaymentDate,
          lastPaymentDate,
          daysToFullPayment,
        };
      }),
    );

    // Calculate analytics for all invoices
    const analytics = calculateAllInvoicesAnalytics(allInvoices, payments);

    return {
      success: true,
      data: {
        invoices: invoicesWithDetails,
        analytics,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch all invoice history: ${error.message}`);
  }
};

const calculateAllInvoicesAnalytics = (invoices, payments) => {
  const finalizedInvoices = invoices.filter((inv) => inv.isFinalized);
  const pendingInvoices = invoices.filter((inv) => !inv.isFinalized);

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalPending = totalRevenue - totalPaid;

  // Payment behavior
  const invoicesWithPayments = invoices.filter((inv) => inv.paidAmount > 0);
  let totalDaysToPayment = 0;
  let onTimeCount = 0;
  let partialPaymentCount = 0;

  invoicesWithPayments.forEach((inv) => {
    const invPayments = payments.filter(
      (p) => p.invoiceId.toString() === inv._id.toString(),
    );
    if (invPayments.length > 0) {
      if (inv.isFinalized) {
        const lastPayment = invPayments.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )[0];
        const days = Math.floor(
          (new Date(lastPayment.createdAt) - new Date(inv.generatedAt)) /
            (1000 * 60 * 60 * 24),
        );
        totalDaysToPayment += days;
        if (days <= 7) onTimeCount++;
      }
      if (
        invPayments.length > 1 ||
        (invPayments.length === 1 && !inv.isFinalized)
      ) {
        partialPaymentCount++;
      }
    }
  });

  const averagePaymentTime =
    finalizedInvoices.length > 0
      ? totalDaysToPayment / finalizedInvoices.length
      : 0;

  // Payment method preference
  const paymentMethodCounts = {};
  payments.forEach((p) => {
    paymentMethodCounts[p.method] = (paymentMethodCounts[p.method] || 0) + 1;
  });

  // Purchase patterns
  const itemPurchases = {};
  const groupPurchases = {};
  let totalItemCount = 0;
  let totalQuantity = 0;

  invoices.forEach((inv) => {
    inv.products.forEach((product) => {
      totalItemCount++;
      totalQuantity += product.quantity;

      const itemKey = product.itemName;
      if (!itemPurchases[itemKey]) {
        itemPurchases[itemKey] = {
          itemName: product.itemName,
          itemGroup: product.itemGroup || 'Uncategorized',
          totalQuantity: 0,
          totalRevenue: 0,
          purchaseCount: 0,
        };
      }
      itemPurchases[itemKey].totalQuantity += product.quantity;
      itemPurchases[itemKey].totalRevenue +=
        product.quantity * product.costPerUnit;
      itemPurchases[itemKey].purchaseCount++;

      const groupKey = product.itemGroup || 'Uncategorized';
      if (!groupPurchases[groupKey]) {
        groupPurchases[groupKey] = {
          groupName: groupKey,
          invoiceCount: 0,
          totalRevenue: 0,
        };
      }
      groupPurchases[groupKey].totalRevenue +=
        product.quantity * product.costPerUnit;
    });

    const uniqueGroups = [
      ...new Set(inv.products.map((p) => p.itemGroup || 'Uncategorized')),
    ];
    uniqueGroups.forEach((group) => {
      if (groupPurchases[group]) {
        groupPurchases[group].invoiceCount++;
      }
    });
  });

  const frequentlyPurchasedItems = Object.values(itemPurchases)
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 10);

  const preferredItemGroups = Object.values(groupPurchases)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  // Timeline
  const sortedInvoices = invoices.sort(
    (a, b) => new Date(a.generatedAt) - new Date(b.generatedAt),
  );
  const firstInvoiceDate =
    sortedInvoices.length > 0 ? sortedInvoices[0].generatedAt : null;
  const lastInvoiceDate =
    sortedInvoices.length > 0
      ? sortedInvoices[sortedInvoices.length - 1].generatedAt
      : null;

  const businessTenure = firstInvoiceDate
    ? Math.floor(
        (new Date() - new Date(firstInvoiceDate)) / (1000 * 60 * 60 * 24),
      )
    : 0;

  const averageDaysBetweenInvoices =
    invoices.length > 1 ? businessTenure / (invoices.length - 1) : 0;

  const monthlyInvoiceFrequency =
    businessTenure > 0 ? (invoices.length / businessTenure) * 30 : 0;

  // Trends - monthly revenue
  const monthlyRevenueMap = {};
  invoices.forEach((inv) => {
    const date = new Date(inv.generatedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyRevenueMap[monthKey]) {
      monthlyRevenueMap[monthKey] = {
        month: monthKey,
        revenue: 0,
        invoiceCount: 0,
      };
    }
    monthlyRevenueMap[monthKey].revenue += inv.totalAmount;
    monthlyRevenueMap[monthKey].invoiceCount++;
  });

  const monthlyRevenue = Object.values(monthlyRevenueMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const revenueGrowthRate =
    monthlyRevenue.length >= 2
      ? (monthlyRevenue[monthlyRevenue.length - 1].revenue -
          monthlyRevenue[monthlyRevenue.length - 2].revenue) /
        monthlyRevenue[monthlyRevenue.length - 2].revenue
      : 0;

  const invoiceFrequencyTrend =
    monthlyRevenue.length >= 2
      ? monthlyRevenue[monthlyRevenue.length - 1].invoiceCount >
        monthlyRevenue[monthlyRevenue.length - 2].invoiceCount
        ? 'increasing'
        : monthlyRevenue[monthlyRevenue.length - 1].invoiceCount <
            monthlyRevenue[monthlyRevenue.length - 2].invoiceCount
          ? 'decreasing'
          : 'stable'
      : 'stable';

  return {
    summary: {
      totalInvoices: invoices.length,
      finalizedInvoices: finalizedInvoices.length,
      pendingInvoices: pendingInvoices.length,
      totalRevenue,
      totalPaid,
      totalPending,
      averageInvoiceValue:
        invoices.length > 0 ? totalRevenue / invoices.length : 0,
      averagePaymentTime,
      totalBusinessValue: totalRevenue,
    },
    paymentBehavior: {
      onTimePaymentRate:
        finalizedInvoices.length > 0
          ? onTimeCount / finalizedInvoices.length
          : 0,
      averageDaysToPayment: averagePaymentTime,
      partialPaymentFrequency:
        invoices.length > 0 ? partialPaymentCount / invoices.length : 0,
      paymentMethodPreference: paymentMethodCounts,
    },
    purchasePatterns: {
      frequentlyPurchasedItems,
      preferredItemGroups,
      averageItemsPerInvoice:
        invoices.length > 0 ? totalItemCount / invoices.length : 0,
      averageQuantityPerInvoice:
        invoices.length > 0 ? totalQuantity / invoices.length : 0,
    },
    timeline: {
      firstInvoiceDate,
      lastInvoiceDate,
      businessTenure,
      averageDaysBetweenInvoices,
      monthlyInvoiceFrequency,
    },
    trends: {
      monthlyRevenue,
      revenueGrowthRate,
      invoiceFrequencyTrend,
    },
  };
};

// ============================================================================
// ALL PAYMENT HISTORY WITH ANALYTICS (ALL INVOICES)
// ============================================================================
export const getAllPaymentHistory = async (clientId) => {
  try {
    // Get all invoices for this client
    const invoices = await repository.find('invoices', { clientId }, null, {
      populate: 'clientCustomerId',
    });
    if (invoices.length === 0) {
      return {
        success: true,
        data: {
          payments: [],
          analytics: {
            paymentSummary: {
              totalPayments: 0,
              totalAmountPaid: 0,
              totalAmountDue: 0,
              remainingBalance: 0,
              paymentCompletionRate: 0,
              totalInvoices: 0,
              fullyPaidInvoices: 0,
              partiallyPaidInvoices: 0,
              unpaidInvoices: 0,
            },
            paymentMethodBreakdown: {},
            timeline: {
              firstPaymentDate: null,
              lastPaymentDate: null,
              totalPaymentDuration: 0,
            },
            insights: {
              recommendations: ['No payment history available'],
            },
          },
        },
      };
    }

    // Get all payments for this client
    const payments = await repository.find('payments', { clientId }, null, {
      sort: { createdAt: 1 },
    });

    // Build payment details with invoice information
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const invoice = invoices.find(
          (inv) => inv._id.toString() === payment.invoiceId.toString(),
        );

        if (!invoice) return null;

        const invoicePayments = payments.filter(
          (p) => p.invoiceId.toString() === invoice._id.toString(),
        );

        const paymentIndex = invoicePayments.findIndex(
          (p) => p._id.toString() === payment._id.toString(),
        );

        const previousPayments = invoicePayments.slice(0, paymentIndex);
        const cumulativeAmount =
          previousPayments.reduce((sum, p) => sum + p.amount, 0) +
          payment.amount;
        const remainingBalance = invoice.totalAmount - cumulativeAmount;
        const percentagePaid = (cumulativeAmount / invoice.totalAmount) * 100;
        const daysFromInvoice = Math.floor(
          (new Date(payment.createdAt) - new Date(invoice.generatedAt)) /
            (1000 * 60 * 60 * 24),
        );

        const invoiceWithProducts =
          await buildInvoiceWithProductDetails(invoice);

        return {
          _id: payment._id,
          clientId: payment.clientId,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          method: payment.method,
          note: payment.note || '',
          paymentNumber: paymentIndex + 1,
          cumulativeAmount,
          remainingBalance: Math.max(remainingBalance, 0),
          percentagePaid: Math.min(percentagePaid, 100),
          daysFromInvoice,
          invoice: {
            invoiceNumber: invoiceWithProducts.invoiceNumber,
            totalAmount: invoiceWithProducts.totalAmount,
            clientCustomer: invoice.clientCustomerId
              ? {
                  _id: invoice.clientCustomerId._id,
                  name: invoice.clientCustomerId.name,
                  phoneNumber: invoice.clientCustomerId.phoneNumber,
                }
              : null,
          },
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        };
      }),
    );

    // Filter out null payments
    const validPayments = paymentsWithDetails.filter((p) => p !== null);

    // Calculate analytics
    const analytics = calculateAllPaymentsAnalytics(invoices, payments);

    return {
      success: true,
      data: {
        payments: validPayments,
        analytics,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch all payment history: ${error.message}`);
  }
};

const calculateAllPaymentsAnalytics = (invoices, payments) => {
  const totalPayments = payments.length;
  const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalAmountDue = invoices.reduce(
    (sum, inv) => sum + inv.totalAmount,
    0,
  );
  const remainingBalance = Math.max(totalAmountDue - totalAmountPaid, 0);
  const paymentCompletionRate =
    totalAmountDue > 0 ? (totalAmountPaid / totalAmountDue) * 100 : 0;

  const fullyPaidInvoices = invoices.filter((inv) => inv.isFinalized).length;
  const partiallyPaidInvoices = invoices.filter(
    (inv) => !inv.isFinalized && inv.paidAmount > 0,
  ).length;
  const unpaidInvoices = invoices.filter((inv) => inv.paidAmount === 0).length;

  // Payment timeline
  const sortedPayments = payments.sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  const firstPaymentDate =
    sortedPayments.length > 0 ? sortedPayments[0].createdAt : null;
  const lastPaymentDate =
    sortedPayments.length > 0
      ? sortedPayments[sortedPayments.length - 1].createdAt
      : null;

  const totalPaymentDuration =
    firstPaymentDate && lastPaymentDate
      ? Math.floor(
          (new Date(lastPaymentDate) - new Date(firstPaymentDate)) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  // Payment method breakdown
  const paymentMethodBreakdown = {};
  payments.forEach((p) => {
    if (!paymentMethodBreakdown[p.method]) {
      paymentMethodBreakdown[p.method] = {
        count: 0,
        totalAmount: 0,
        percentage: 0,
      };
    }
    paymentMethodBreakdown[p.method].count++;
    paymentMethodBreakdown[p.method].totalAmount += p.amount;
  });

  Object.keys(paymentMethodBreakdown).forEach((method) => {
    paymentMethodBreakdown[method].percentage =
      totalAmountPaid > 0
        ? (paymentMethodBreakdown[method].totalAmount / totalAmountPaid) * 100
        : 0;
  });

  // Payment pattern
  const averagePaymentSize =
    payments.length > 0 ? totalAmountPaid / payments.length : 0;

  // Monthly payment trends
  const monthlyPaymentMap = {};
  payments.forEach((payment) => {
    const date = new Date(payment.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyPaymentMap[monthKey]) {
      monthlyPaymentMap[monthKey] = {
        month: monthKey,
        totalAmount: 0,
        paymentCount: 0,
      };
    }
    monthlyPaymentMap[monthKey].totalAmount += payment.amount;
    monthlyPaymentMap[monthKey].paymentCount++;
  });

  const monthlyPayments = Object.values(monthlyPaymentMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  // Insights
  const recommendations = [];
  if (unpaidInvoices > 0) {
    recommendations.push(`${unpaidInvoices} invoices have no payments yet`);
  }
  if (partiallyPaidInvoices > 0) {
    recommendations.push(
      `${partiallyPaidInvoices} invoices are partially paid`,
    );
  }
  if (remainingBalance > 0) {
    recommendations.push(
      `Total outstanding balance: ₹${remainingBalance.toFixed(2)}`,
    );
  }

  const preferredMethod =
    Object.keys(paymentMethodBreakdown).length > 0
      ? Object.keys(paymentMethodBreakdown).reduce((a, b) =>
          paymentMethodBreakdown[a].totalAmount >
          paymentMethodBreakdown[b].totalAmount
            ? a
            : b,
        )
      : null;

  if (preferredMethod) {
    const preferredPercentage =
      paymentMethodBreakdown[preferredMethod].percentage.toFixed(2);
    recommendations.push(
      `Most used payment method: ${preferredMethod.toUpperCase()} (${preferredPercentage}%)`,
    );
  }

  return {
    paymentSummary: {
      totalPayments,
      totalAmountPaid,
      totalAmountDue,
      remainingBalance,
      paymentCompletionRate: Math.min(paymentCompletionRate, 100),
      totalInvoices: invoices.length,
      fullyPaidInvoices,
      partiallyPaidInvoices,
      unpaidInvoices,
    },
    paymentTimeline: {
      firstPaymentDate,
      lastPaymentDate,
      totalPaymentDuration,
      averagePaymentSize,
    },
    paymentMethodBreakdown,
    trends: {
      monthlyPayments,
    },
    insights: {
      recommendations,
    },
  };
};

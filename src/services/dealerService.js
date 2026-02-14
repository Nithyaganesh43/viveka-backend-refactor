import mongoose from 'mongoose';
import repository from '../repository/repository.js';

const toObjectId = (id) => {
  if (!id) return null;
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
};

export const createDealer = async (clientId, payload) => {
  const {
    name,
    contactPerson = '',
    phoneNumber = '',
    email = '',
    address = '',
    logoUrl = '',
  } = payload || {};
  if (!name) throw new Error('name is required');
  const dealer = await repository.create('dealers', {
    clientId,
    name,
    contactPerson,
    phoneNumber,
    email,
    address,
    logoUrl,
  });
  return { success: true, dealer };
};

export const getDealers = async (clientId) => {
  const dealers = await repository.find('dealers', { clientId, isActive: true }, null, {
    sort: { createdAt: -1 },
  });
  return { success: true, dealers };
};

export const updateDealer = async (clientId, dealerId, updateData) => {
  const dealer = await repository.updateOne(
    'dealers',
    { _id: dealerId, clientId },
    { ...updateData, updatedAt: new Date() },
    { new: true },
  );
  if (!dealer) throw new Error('Dealer not found');
  return { success: true, dealer };
};

export const deleteDealer = async (clientId, dealerId) => {
  const dealer = await repository.updateOne(
    'dealers',
    { _id: dealerId, clientId },
    { isActive: false, updatedAt: new Date() },
    { new: true },
  );
  if (!dealer) throw new Error('Dealer not found');
  return { success: true, message: 'Dealer deactivated' };
};

export const getDealerItems = async (
  clientId,
  dealerId,
  { lowStockOnly = false } = {},
) => {
  // Filter items where dealerIds array contains this dealer
  const filter = {
    clientId,
    isActive: true,
    dealerIds: toObjectId(dealerId),
  };
  if (lowStockOnly) {
    // Use lowStockQuantity field for dynamic threshold
    filter.$expr = { $lte: ['$stock', '$lowStockQuantity'] };
  }
  const items = await repository.find('items', filter, null, { sort: { updatedAt: -1 } });
  return { success: true, items };
};

export const recommendLowStockItems = async (clientId, dealerId) => {
  const items = await repository.aggregate('items', [
    {
      $match: {
        clientId: toObjectId(clientId),
        isActive: true,
        dealerIds: toObjectId(dealerId),
      },
    },
    {
      $addFields: {
        suggestedQty: {
          // Suggest enough to reach double the lowStockQuantity threshold,
          // with a minimum of 1 unit.
          $max: [
            { $subtract: [{ $multiply: ['$lowStockQuantity', 2] }, '$stock'] },
            1,
          ],
        },
        isLowStock: { $lte: ['$stock', '$lowStockQuantity'] },
      },
    },
    { $match: { isLowStock: true } },
    { $sort: { stock: 1, updatedAt: -1 } },
  ]);
  return items;
};

export const createDealerOrder = async (clientId, payload) => {
  const {
    dealerId,
    items,
    notes = '',
    deliveryInstructions = '',
    isUrgent = false,
    pdfUrl = '',
    orderNumber,
    totalAmount = null,
    dueDate = null,
  } = payload || {};

  if (!dealerId) throw new Error('dealerId is required');
  if (!Array.isArray(items) || items.length === 0)
    throw new Error('items array is required');

  const itemIds = items
    .map((i) => i?.itemId)
    .filter(Boolean)
    .map((id) => id.toString());
  if (itemIds.length !== items.length)
    throw new Error('Each item must include itemId');

  for (const i of items) {
    if (!i.quantity || i.quantity <= 0)
      throw new Error('Each item must include quantity > 0');
  }

  const dbItems = await repository.find('items', {
    _id: { $in: itemIds },
    clientId,
    isActive: true,
  });
  const map = new Map(dbItems.map((it) => [it._id.toString(), it]));

  // Validate all items belong to the specified dealer (check dealerIds array)
  for (const item of dbItems) {
    const itemDealerIds = (item.dealerIds || []).map((id) => id.toString());
    if (!itemDealerIds.includes(dealerId.toString())) {
      throw new Error(`Item "${item.name}" is not mapped to this dealer`);
    }
  }

  const lines = items.map((line) => {
    const dbItem = map.get(line.itemId.toString());
    if (!dbItem) throw new Error('Item not found');
    return {
      itemId: dbItem._id,
      itemNameSnapshot: dbItem.name,
      quantity: Number(line.quantity),
    };
  });

  const finalOrderNumber = orderNumber || `DORD-${Date.now()}`;

  const order = await repository.create('dealerorders', {
    clientId,
    dealerId,
    orderNumber: finalOrderNumber,
    status: 'pending',
    isUrgent: Boolean(isUrgent),
    deliveryInstructions,
    notes,
    pdfUrl,
    totalAmount,
    dueDate: dueDate ? new Date(dueDate) : null,
  });

  await repository.bulkCreate('dealerorderitems',
    lines.map((l) => ({ ...l, orderId: order._id })),
  );

  return { success: true, order };
};

export const getDealerOrders = async (clientId, dealerId) => {
  const orders = await repository.find('dealerorders', { clientId, dealerId }, null, {
    sort: { createdAt: -1 },
  });
  return { success: true, orders };
};

export const getDealerOrderById = async (clientId, orderId) => {
  const order = await repository.findOne('dealerorders', { _id: orderId, clientId });
  if (!order) throw new Error('Order not found');
  const items = await repository.find('dealerorderitems', { orderId: order._id });
  return { success: true, order, items };
};

export const cancelDealerOrder = async (clientId, orderId) => {
  const order = await repository.findOne('dealerorders', { _id: orderId, clientId });
  if (!order) throw new Error('Order not found');
  if (order.status !== 'pending')
    throw new Error('Only pending orders can be cancelled');
  
  const updatedOrder = await repository.updateOne(
    'dealerorders',
    { _id: orderId, clientId },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true },
  );
  return { success: true, order: updatedOrder };
};

/**
 * Update order total amount and due date (can be called anytime after order creation)
 */
export const updateOrderTotal = async (clientId, orderId, payload) => {
  const { totalAmount, dueDate } = payload || {};

  const order = await repository.findOne('dealerorders', { _id: orderId, clientId });
  if (!order) throw new Error('Order not found');
  if (order.status === 'cancelled')
    throw new Error('Cannot update cancelled orders');

  const updateData = { updatedAt: new Date() };

  if (totalAmount !== undefined) {
    if (totalAmount !== null && totalAmount < 0) {
      throw new Error('Total amount cannot be negative');
    }
    updateData.totalAmount = totalAmount;
  }

  if (dueDate !== undefined) {
    updateData.dueDate = dueDate ? new Date(dueDate) : null;
  }

  const updatedOrder = await repository.updateOne(
    'dealerorders',
    { _id: orderId, clientId },
    updateData,
    { new: true },
  );

  return { success: true, order: updatedOrder };
};

/**
 * Get all payments made for a specific order
 */
export const getOrderPayments = async (clientId, orderId) => {
  const order = await repository.findOne('dealerorders', { _id: orderId, clientId });
  if (!order) throw new Error('Order not found');

  const payments = await repository.find('dealerpayments', { clientId, orderId }, null, {
    sort: { paidAt: -1 },
  });

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const orderTotal = order.totalAmount || 0;
  const remaining = Math.max(orderTotal - totalPaid, 0);

  return {
    success: true,
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      dueDate: order.dueDate,
      status: order.status,
    },
    payments,
    summary: {
      totalPaid,
      remaining,
      isPaidInFull: remaining === 0 && orderTotal > 0,
    },
  };
};

export const markDealerOrderDelivered = async (
  clientId,
  orderId,
  { deliveredBy, deliveryNote, totalAmount, dueDate } = {},
) => {
  const order = await repository.findOne('dealerorders', {
    _id: orderId,
    clientId,
  });
  if (!order) throw new Error('Order not found');
  if (order.status !== 'pending') {
    throw new Error('Only pending orders can be marked delivered');
  }

  const orderItems = await repository.find('dealerorderitems', {
    orderId: order._id,
  });
  if (!orderItems.length) throw new Error('Order has no items');

  // Stock increment in single operation (avoids N+1 queries)
  const stockUpdates = orderItems.map((line) => ({
    updateOne: {
      filter: { _id: line.itemId, clientId },
      update: {
        $inc: { stock: line.quantity },
        $set: { updatedAt: new Date() },
      },
    },
  }));
  if (stockUpdates.length > 0) {
    await repository.bulkWrite('items', stockUpdates);
  }

  const updateData = {
    status: 'delivered',
    deliveredAt: new Date(),
    deliveryAudit: {
      deliveredBy: deliveredBy || '',
      deliveryNote: deliveryNote || '',
      deliveredAt: new Date(),
    },
  };

  // Update totalAmount and dueDate if provided
  if (totalAmount !== undefined && totalAmount !== null) {
    updateData.totalAmount = totalAmount;
  }
  if (dueDate !== undefined) {
    updateData.dueDate = dueDate ? new Date(dueDate) : null;
  }

  const updatedOrder = await repository.updateOne(
    'dealerorders',
    { _id: orderId, clientId },
    updateData,
    { new: true },
  );

  return { success: true, order: updatedOrder };
};

export const createDealerPayment = async (clientId, payload) => {
  const {
    dealerId,
    orderId = null,
    amount,
    method = 'cash',
    note = '',
    proofUrl = '',
    paidAt,
  } = payload || {};
  if (!dealerId) throw new Error('dealerId is required');
  if (!amount || amount <= 0) throw new Error('amount must be > 0');

  // If orderId is provided, validate it belongs to the dealer
  if (orderId) {
    const order = await repository.findOne('dealerorders', {
      _id: orderId,
      clientId,
      dealerId,
    });
    if (!order)
      throw new Error('Order not found or does not belong to this dealer');
  }

  const payment = await repository.create('dealerpayments', {
    clientId,
    dealerId,
    orderId,
    amount,
    method,
    note,
    proofUrl,
    paidAt: paidAt ? new Date(paidAt) : new Date(),
  });
  return { success: true, payment };
};

export const getDealerPayments = async (clientId, dealerId) => {
  const payments = await repository.find('dealerpayments', { clientId, dealerId }, null, {
    sort: { paidAt: -1 },
  });
  return { success: true, payments };
};

export const getDealerSummary = async (clientId, dealerId) => {
  const [ordersAgg, paymentsAgg] = await Promise.all([
    repository.aggregate('dealerorders', [
      {
        $match: {
          clientId: toObjectId(clientId),
          dealerId: toObjectId(dealerId),
          status: { $ne: 'cancelled' },
          totalAmount: { $ne: null },
        },
      },
      { $group: { _id: null, totalOrdered: { $sum: '$totalAmount' } } },
    ]),
    repository.aggregate('dealerpayments', [
      {
        $match: {
          clientId: toObjectId(clientId),
          dealerId: toObjectId(dealerId),
        },
      },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
    ]),
  ]);

  const totalOrdered = ordersAgg[0]?.totalOrdered || 0;
  const totalPaid = paymentsAgg[0]?.totalPaid || 0;
  const payable = Math.max(totalOrdered - totalPaid, 0);

  const [recentOrders, recentPayments] = await Promise.all([
    repository.find('dealerorders', { clientId, dealerId }, null, {
      sort: { createdAt: -1 },
      limit: 20,
      lean: true,
    }),
    repository.find('dealerpayments', { clientId, dealerId }, null, {
      sort: { paidAt: -1 },
      limit: 20,
      lean: true,
    }),
  ]);

  const timeline = [
    ...recentOrders.map((o) => ({ type: 'order', at: o.createdAt, data: o })),
    ...recentPayments.map((p) => ({ type: 'payment', at: p.paidAt, data: p })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return { success: true, totalOrdered, totalPaid, payable, timeline };
};

// ================= DEALER TRANSACTIONS =================

/**
 * Get transactions for a specific dealer (orders + payments combined as timeline)
 */
export const getDealerTransactions = async (
  clientId,
  dealerId,
  options = {},
) => {
  const { limit = 50, skip = 0 } = options;

  const dealer = await repository.findOne('dealers', {
    _id: dealerId,
    clientId,
    isActive: true,
  });
  if (!dealer) throw new Error('Dealer not found');

  const [orders, payments] = await Promise.all([
    repository.find('dealerorders', { clientId, dealerId }, null, { sort: { createdAt: -1 }, lean: true }),
    repository.find('dealerpayments', { clientId, dealerId }, null, { sort: { paidAt: -1 }, lean: true }),
  ]);

  // Combine orders and payments into a single transactions timeline
  const transactions = [
    ...orders.map((o) => ({
      type: 'order',
      transactionId: o._id,
      dealerId: o.dealerId,
      dealerName: dealer.name,
      orderNumber: o.orderNumber,
      amount: o.totalAmount,
      status: o.status,
      dueDate: o.dueDate,
      date: o.createdAt,
      details: {
        isUrgent: o.isUrgent,
        deliveredAt: o.deliveredAt,
        cancelledAt: o.cancelledAt,
        notes: o.notes,
      },
    })),
    ...payments.map((p) => ({
      type: 'payment',
      transactionId: p._id,
      dealerId: p.dealerId,
      dealerName: dealer.name,
      orderId: p.orderId,
      amount: p.amount,
      method: p.method,
      date: p.paidAt,
      details: {
        note: p.note,
        proofUrl: p.proofUrl,
      },
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const paginatedTransactions = transactions.slice(skip, skip + limit);

  return {
    success: true,
    dealer: {
      _id: dealer._id,
      name: dealer.name,
      contactPerson: dealer.contactPerson,
      phoneNumber: dealer.phoneNumber,
    },
    totalCount: transactions.length,
    transactions: paginatedTransactions,
  };
};

/**
 * Get all dealer transactions across all dealers for a client
 */
export const getAllDealerTransactions = async (clientId, options = {}) => {
  const { limit = 50, skip = 0 } = options;

  // Get all active dealers for the client
  const dealers = await repository.find('dealers', { clientId, isActive: true }, null, { lean: true });
  const dealerMap = new Map(dealers.map((d) => [d._id.toString(), d]));

  const [orders, payments] = await Promise.all([
    repository.find('dealerorders', { clientId }, null, { sort: { createdAt: -1 }, lean: true }),
    repository.find('dealerpayments', { clientId }, null, { sort: { paidAt: -1 }, lean: true }),
  ]);

  // Combine orders and payments into a single transactions timeline
  const transactions = [
    ...orders.map((o) => {
      const dealer = dealerMap.get(o.dealerId?.toString());
      return {
        type: 'order',
        transactionId: o._id,
        dealerId: o.dealerId,
        dealerName: dealer?.name || 'Unknown Dealer',
        orderNumber: o.orderNumber,
        amount: o.totalAmount,
        status: o.status,
        dueDate: o.dueDate,
        date: o.createdAt,
        details: {
          isUrgent: o.isUrgent,
          deliveredAt: o.deliveredAt,
          cancelledAt: o.cancelledAt,
          notes: o.notes,
        },
      };
    }),
    ...payments.map((p) => {
      const dealer = dealerMap.get(p.dealerId?.toString());
      return {
        type: 'payment',
        transactionId: p._id,
        dealerId: p.dealerId,
        dealerName: dealer?.name || 'Unknown Dealer',
        orderId: p.orderId,
        amount: p.amount,
        method: p.method,
        date: p.paidAt,
        details: {
          note: p.note,
          proofUrl: p.proofUrl,
        },
      };
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const paginatedTransactions = transactions.slice(skip, skip + limit);

  // Calculate summary - only count orders with totalAmount set
  const totalOrders = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    success: true,
    summary: {
      totalDealers: dealers.length,
      totalOrders: totalOrders,
      totalPayments: totalPayments,
      pendingPayable: Math.max(totalOrders - totalPayments, 0),
    },
    totalCount: transactions.length,
    transactions: paginatedTransactions,
  };
};

// ================= DEALER ORDER PAYMENT TRANSACTIONS =================

/**
 * Get all orders with their payment status for a client
 * @param {string} clientId - Client ID
 * @param {Object} options - Query options (status: 'all' | 'pending' | 'paid' | 'partial')
 */
export const getOrderPaymentTransactions = async (clientId, options = {}) => {
  const { status = 'all', dealerId = null, limit = 50, skip = 0 } = options;

  const orderFilter = { clientId, status: { $ne: 'cancelled' } };
  if (dealerId) {
    orderFilter.dealerId = toObjectId(dealerId);
  }

  const orders = await repository.find('dealerorders', orderFilter, null, {
    populate: { path: 'dealerId', select: 'name contactPerson phoneNumber' },
    sort: { createdAt: -1 },
    lean: true,
  });

  // Get all payments grouped by orderId
  const orderIds = orders.map((o) => o._id);
  const payments = await repository.find('dealerpayments', {
    clientId,
    orderId: { $in: orderIds },
  }, null, { lean: true });

  // Group payments by orderId
  const paymentsByOrder = payments.reduce((acc, p) => {
    const key = p.orderId?.toString() || 'unlinked';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Calculate payment status for each order
  const ordersWithPaymentStatus = orders.map((order) => {
    const orderPayments = paymentsByOrder[order._id.toString()] || [];
    const totalPaid = orderPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );
    const orderTotal = order.totalAmount || 0;
    const remaining = Math.max(orderTotal - totalPaid, 0);

    let paymentStatus = 'pending';
    if (orderTotal === 0 || orderTotal === null) {
      paymentStatus = 'no-bill'; // Bill not yet entered
    } else if (remaining === 0) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      dealerId: order.dealerId?._id || order.dealerId,
      dealerName: order.dealerId?.name || 'Unknown',
      status: order.status,
      totalAmount: order.totalAmount,
      dueDate: order.dueDate,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      paymentStatus,
      totalPaid,
      remaining,
      paymentCount: orderPayments.length,
    };
  });

  // Filter by payment status if specified
  let filteredOrders = ordersWithPaymentStatus;
  if (status !== 'all') {
    filteredOrders = ordersWithPaymentStatus.filter(
      (o) => o.paymentStatus === status,
    );
  }

  const paginatedOrders = filteredOrders.slice(skip, skip + limit);

  // Calculate summary
  const summary = {
    totalOrders: ordersWithPaymentStatus.length,
    pendingOrders: ordersWithPaymentStatus.filter(
      (o) => o.paymentStatus === 'pending',
    ).length,
    partialOrders: ordersWithPaymentStatus.filter(
      (o) => o.paymentStatus === 'partial',
    ).length,
    paidOrders: ordersWithPaymentStatus.filter(
      (o) => o.paymentStatus === 'paid',
    ).length,
    noBillOrders: ordersWithPaymentStatus.filter(
      (o) => o.paymentStatus === 'no-bill',
    ).length,
    totalAmount: ordersWithPaymentStatus.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0,
    ),
    totalPaid: ordersWithPaymentStatus.reduce((sum, o) => sum + o.totalPaid, 0),
    totalRemaining: ordersWithPaymentStatus.reduce(
      (sum, o) => sum + o.remaining,
      0,
    ),
  };

  return {
    success: true,
    summary,
    totalCount: filteredOrders.length,
    orders: paginatedOrders,
  };
};

/**
 * Get payment details for a single order
 */
export const getOrderPaymentDetails = async (clientId, orderId) => {
  const order = await repository.findOne('dealerorders', { _id: orderId, clientId }, null, {
    populate: { path: 'dealerId', select: 'name contactPerson phoneNumber' },
    lean: true,
  });

  if (!order) throw new Error('Order not found');

  const payments = await repository.find('dealerpayments', { clientId, orderId }, null, {
    sort: { paidAt: -1 },
    lean: true,
  });

  const items = await repository.find('dealerorderitems', { orderId }, null, { lean: true });

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const orderTotal = order.totalAmount || 0;
  const remaining = Math.max(orderTotal - totalPaid, 0);

  let paymentStatus = 'pending';
  if (orderTotal === 0 || orderTotal === null) {
    paymentStatus = 'no-bill';
  } else if (remaining === 0) {
    paymentStatus = 'paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partial';
  }

  return {
    success: true,
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      dealerId: order.dealerId?._id || order.dealerId,
      dealerName: order.dealerId?.name || 'Unknown',
      dealerContact: order.dealerId?.contactPerson || '',
      dealerPhone: order.dealerId?.phoneNumber || '',
      status: order.status,
      totalAmount: order.totalAmount,
      dueDate: order.dueDate,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      notes: order.notes,
    },
    items,
    paymentSummary: {
      paymentStatus,
      totalPaid,
      remaining,
      isPaidInFull: remaining === 0 && orderTotal > 0,
    },
    payments,
  };
};

/**
 * Get all payments for a client with optional filters
 */
export const getAllPayments = async (clientId, options = {}) => {
  const { dealerId = null, orderId = null, limit = 50, skip = 0 } = options;

  const filter = { clientId };
  if (dealerId) filter.dealerId = toObjectId(dealerId);
  if (orderId) filter.orderId = toObjectId(orderId);

  const payments = await repository.find('dealerpayments', filter, null, {
    populate: [
      { path: 'dealerId', select: 'name' },
      { path: 'orderId', select: 'orderNumber totalAmount' },
    ],
    sort: { paidAt: -1 },
    lean: true,
  });

  const paginatedPayments = payments.slice(skip, skip + limit);

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    success: true,
    summary: {
      totalPayments: payments.length,
      totalAmount,
    },
    totalCount: payments.length,
    payments: paginatedPayments.map((p) => ({
      _id: p._id,
      dealerId: p.dealerId?._id || p.dealerId,
      dealerName: p.dealerId?.name || 'Unknown',
      orderId: p.orderId?._id || p.orderId,
      orderNumber: p.orderId?.orderNumber || null,
      amount: p.amount,
      method: p.method,
      note: p.note,
      proofUrl: p.proofUrl,
      paidAt: p.paidAt,
    })),
  };
};

/**
 * Get a single payment by ID
 */
export const getPaymentById = async (clientId, paymentId) => {
  const payment = await repository.findOne('dealerpayments', { _id: paymentId, clientId }, null, {
    populate: [
      { path: 'dealerId', select: 'name contactPerson phoneNumber' },
      { path: 'orderId', select: 'orderNumber totalAmount status' },
    ],
    lean: true,
  });

  if (!payment) throw new Error('Payment not found');

  return {
    success: true,
    payment: {
      _id: payment._id,
      dealerId: payment.dealerId?._id || payment.dealerId,
      dealerName: payment.dealerId?.name || 'Unknown',
      dealerContact: payment.dealerId?.contactPerson || '',
      dealerPhone: payment.dealerId?.phoneNumber || '',
      orderId: payment.orderId?._id || payment.orderId,
      orderNumber: payment.orderId?.orderNumber || null,
      orderTotal: payment.orderId?.totalAmount || null,
      amount: payment.amount,
      method: payment.method,
      note: payment.note,
      proofUrl: payment.proofUrl,
      paidAt: payment.paidAt,
    },
  };
};

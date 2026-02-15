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
 
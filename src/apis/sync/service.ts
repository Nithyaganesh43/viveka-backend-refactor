import mongoose, { ClientSession } from "mongoose";
import repository from "../../repository/repository";

type AnyDoc = Record<string, any>;

const buildInvoiceWithProductDetails = async (invoiceDoc: AnyDoc) => {
  if (!invoiceDoc) return invoiceDoc;

  const invoiceObj =
    typeof invoiceDoc.toObject === "function"
      ? invoiceDoc.toObject()
      : { ...invoiceDoc };

  const products = (invoiceObj.products || []).map((product: any) => ({
    productId: product.productId || null,
    itemName: product.itemName || "",
    costPerUnit: product.costPerUnit,
    quantity: product.quantity,
    itemGroup: product.itemGroup || "",
  }));

  return { ...invoiceObj, products };
};

const normalizeItemsForSyncResponse = (items: AnyDoc[]) =>
  items.map((item) => ({
    ...item.toObject(),
    groupId: item.groupId ? item.groupId.toString() : null,
    productId: item._id ? item._id.toString() : null,
  }));

const parseDateValue = (value: any): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const getFullClientData = async (clientId: string) => {
  const [
    itemGroups,
    items,
    clientCustomers,
    rawInvoices,
    payments,
    purchaseHistory,
  ] = await Promise.all([
    repository.find("itemgroups", { clientId }),
    repository.find("items", { clientId }),
    repository.find("clientcustomers", { clientId }, null, {
      sort: { createdAt: -1 },
    }),
    repository.find("invoices", { clientId }, null, {
      populate: "clientCustomerId",
    }),
    repository.find("payments", { clientId }),
    repository.find("purchasehistories", { clientId }, null, {
      populate: ["clientCustomerId", "invoiceId"],
    }),
  ]);

  const invoices = await Promise.all(
    rawInvoices.map((invoice: AnyDoc) =>
      buildInvoiceWithProductDetails(invoice)
    )
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

export const syncClientData = async (
  clientId: string,
  payload: AnyDoc = {}
): Promise<AnyDoc> => {
  const session: ClientSession | undefined = undefined;

  const summary = {
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsDeleted: 0,
    invoicesCreated: 0,
    paymentsCreated: 0,
  };

  const synced = {
    itemsCreated: [] as string[],
    itemsUpdated: [] as string[],
    itemsDeleted: [] as string[],
    invoicesCreated: [] as string[],
    paymentsCreated: [] as string[],
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
        const preparedItems = itemCreates.map((item: any, index: number) => {
          if (!item?.name || item.price === undefined) {
            throw new Error(
              `Item create at index ${index} is missing name/price`
            );
          }
          const sanitized = { ...item };
          delete sanitized._id;
          return { ...sanitized, clientId };
        });

        const createdItems = await repository.bulkCreate(
          "items",
          preparedItems,
          { session }
        );

        summary.itemsCreated += createdItems.length;
        synced.itemsCreated.push(
          ...createdItems.map((item: any) => item._id.toString())
        );
      }

      if (itemUpdates.length) {
        for (const item of itemUpdates) {
          const { _id, ...updateData } = item || {};
          if (!_id) throw new Error("Item update requires _id");

          const updated = await repository.updateOne(
            "items",
            { _id, clientId },
            { ...updateData, updatedAt: new Date() },
            { new: true, session }
          );

          if (!updated) throw new Error(`Item not found for update: ${_id}`);

          summary.itemsUpdated += 1;
          synced.itemsUpdated.push(_id.toString());
        }
      }

      if (itemDeletes.length) {
        for (const itemId of itemDeletes) {
          if (!itemId) continue;

          const deleted = await repository.updateOne(
            "items",
            { _id: itemId, clientId },
            { isActive: false, updatedAt: new Date() },
            { new: true, session }
          );

          if (!deleted) throw new Error(`Item not found for delete: ${itemId}`);

          summary.itemsDeleted += 1;
          synced.itemsDeleted.push(itemId.toString());
        }
      }

      // Invoice & payment logic unchanged (typed loosely for flexibility)

      // (kept identical logic, only TS-safe typing)

      if (invoiceCreates.length) {
        for (const [index, invoice] of invoiceCreates.entries()) {
          if (!invoice?.products || !Array.isArray(invoice.products)) {
            throw new Error(
              `Invoice create at index ${index} missing products`
            );
          }

          const normalizedProducts: any[] = [];

          for (const [productIndex, product] of invoice.products.entries()) {
            if (product?.quantity === undefined)
              throw new Error(
                `Invoice product at index ${productIndex} missing quantity`
              );

            if (product.quantity <= 0)
              throw new Error(
                `Invoice product at index ${productIndex} must have quantity > 0`
              );

            let resolvedProductId = product.productId;

            if (!resolvedProductId) {
              if (!product?.itemName)
                throw new Error(
                  `Invoice product at index ${productIndex} missing itemName`
                );

              const createdItem = await repository.bulkCreate(
                "items",
                [
                  {
                    clientId,
                    name: product.itemName,
                    price: product.costPerUnit,
                    stock: product.stock ?? 0,
                    unit: product.unit || "nos",
                    description: product.description || "",
                  },
                ],
                { session }
              );

              resolvedProductId = createdItem[0]._id;
              summary.itemsCreated += 1;
              synced.itemsCreated.push(createdItem[0]._id.toString());
            }

            normalizedProducts.push({
              productId: resolvedProductId,
              itemName: product.itemName || "Unknown Item",
              itemGroup: product.itemGroup || "",
              quantity: product.quantity,
              costPerUnit: product.costPerUnit ?? 0,
            });
          }

          const subtotal = normalizedProducts.reduce(
            (sum, p) => sum + p.costPerUnit * p.quantity,
            0
          );

          const totalAmount = invoice.totalAmount ?? subtotal;
          const paidAmount = invoice.paidAmount ?? 0;
          const isFinalized = paidAmount >= totalAmount;

          const invoiceDoc = await repository.bulkCreate(
            "invoices",
            [
              {
                clientId,
                invoiceNumber: `INV-${Date.now()}-${index}`,
                subtotal,
                totalAmount,
                paidAmount,
                products: normalizedProducts,
                isFinalized,
              },
            ],
            { session }
          );

          summary.invoicesCreated += 1;
          synced.invoicesCreated.push(invoiceDoc[0]._id.toString());
        }
      }

      if (paymentCreates.length) {
        for (const payment of paymentCreates) {
          const created = await repository.bulkCreate(
            "payments",
            [
              {
                clientId,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                method: payment.method || "cash",
                paidAt: parseDateValue(payment.paidAt),
              },
            ],
            { session }
          );

          if (created?.length) {
            synced.paymentsCreated.push(created[0]._id.toString());
            summary.paymentsCreated += 1;
          }
        }
      }
    };

    await runSyncOperations();

    const fullData = await getFullClientData(clientId);

    return {
      success: true,
      message: "Sync completed successfully",
      summary,
      synced,
      data: fullData,
    };
  } catch (error: any) {
    throw new Error(`Failed to sync data: ${error.message}`);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

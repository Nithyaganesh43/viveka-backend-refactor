# Sync Module – Core Concept & System Rules

## Purpose

The Sync Module enables **offline-first functionality** by allowing the mobile app to queue operations locally and synchronize them with the server when connectivity is restored.

This module is the **single source of truth** for:

- Batch data synchronization
- Offline queue processing
- Full client data retrieval
- Transactional consistency during sync

---

## Core Design Principles

1. **Offline-First Architecture**
   - App works fully without network
   - All operations queue locally
   - Sync when connectivity returns
   - No data loss during offline periods

2. **Atomic Transactions**
   - Sync operations run in MongoDB transaction
   - All-or-nothing execution
   - Rollback on any failure
   - Data consistency guaranteed

3. **Idempotency Support**
   - Operations can be safely retried
   - Duplicate requests detected
   - No double-creation of records
   - Safe for unstable networks

4. **Full Data Return**
   - After sync, return complete client dataset
   - Client app rebuilds local state
   - Single source of truth maintained
   - Eliminates state drift

---

## Sync Endpoints

### Ready to Sync

**Endpoint:** `POST /api/readytosync`

**Purpose:** Verify session validity before sync.

**Authentication:** Required (JWT)

**Response:**

```javascript
{
  success: true,
  message: 'OK',
  clientId: '...'
}
```

Use this to check if the token is still valid before attempting a full sync.

---

### Sync Data

**Endpoint:** `POST /api/sync`

**Purpose:** Process offline queue and return full dataset.

**Authentication:** Required (JWT)

---

## Sync Payload Structure

The sync endpoint accepts a structured payload with operations to perform:

```javascript
{
  item: {
    create: [],    // New items to create
    update: [],    // Existing items to update
    delete: []     // Item IDs to soft-delete
  },
  invoice: {
    create: []     // New invoices to create
  },
  payment: {
    create: []     // New payments to record
  }
}
```

---

## Supported Operations

### Item Operations

#### Create Items

```javascript
item.create: [
  {
    name: "Product Name",      // Required
    price: 100,                // Required
    stock: 50,                 // Optional, default: 0
    unit: "nos",               // Optional, default: 'nos'
    groupId: "...",            // Optional
    description: "..."         // Optional
  }
]
```

**Rules:**

- `_id` is stripped if provided (server generates)
- `clientId` is set from authenticated session
- Returns created item IDs in response

#### Update Items

```javascript
item.update: [
  {
    _id: "item_id",            // Required
    name: "Updated Name",      // Any field to update
    price: 150,
    stock: 30
  }
]
```

**Rules:**

- `_id` is required
- Only provided fields are updated
- Item must exist and belong to client
- `updatedAt` is set automatically

#### Delete Items

```javascript
item.delete: ["item_id_1", "item_id_2"]
```

**Rules:**

- Soft delete only (`isActive: false`)
- Item must exist and belong to client
- Historical references preserved

---

### Invoice Operations

#### Create Invoices

```javascript
invoice.create: [
  {
    products: [                   // Required
      {
        productId: "...",         // Optional - if missing, creates item
        itemName: "Product",      // Required if no productId
        costPerUnit: 100,         // Required if no productId
        quantity: 2,              // Required
        itemGroup: "Group"        // Optional
      }
    ],
    clientCustomerId: "...",      // Optional
    clientCustomerName: "...",    // Optional
    clientCustomerPhone: "...",   // Optional
    invoiceNumber: "INV-...",     // Optional - auto-generated
    invoiceDate: "2025-01-12",    // Optional
    dueDate: "2025-02-12",        // Optional
    subtotal: 200,                // Optional - calculated if missing
    totalTax: 0,                  // Optional
    totalDiscount: 0,             // Optional
    totalAmount: 200,             // Optional - calculated if missing
    paidAmount: 100,              // Optional - default: 0
    notes: "..."                  // Optional
  }
]
```

**Auto-Item Creation:**

If `productId` is not provided for a product, the system:

1. Creates a new item with `itemName` and `costPerUnit`
2. Uses the new item's ID as `productId`
3. Tracks this in `summary.itemsCreated`

**Calculations:**

- `subtotal` = sum of (costPerUnit × quantity) if not provided
- `totalAmount` = subtotal + totalTax - totalDiscount if not provided
- `isFinalized` = paidAmount >= totalAmount

**Stock Decrement:**

- For each product with valid `productId`
- Stock decremented by quantity
- Only if sufficient stock exists

**Purchase History:**

- Created automatically if invoice is finalized
- Links customer to invoice
- Only if `clientCustomerId` exists

---

### Payment Operations

#### Create Payments

```javascript
payment.create: [
  {
    invoiceId: "...",      // Required
    amount: 100,           // Required, > 0
    method: "cash",        // Optional, default: 'cash'
    note: "...",           // Optional
    paidAt: "2025-01-12"   // Optional, default: now
  }
]
```

**Rules:**

- Invoice must exist and belong to client
- Amount must not exceed remaining balance
- Invoice `paidAmount` is incremented
- If fully paid, invoice becomes finalized
- Purchase history created on finalization

---

## Sync Response

```javascript
{
  success: true,
  message: 'Sync completed successfully',
  summary: {
    itemsCreated: 2,
    itemsUpdated: 1,
    itemsDeleted: 0,
    invoicesCreated: 1,
    paymentsCreated: 1
  },
  synced: {
    itemsCreated: ["id1", "id2"],
    itemsUpdated: ["id3"],
    itemsDeleted: [],
    invoicesCreated: ["inv_id"],
    paymentsCreated: ["pay_id"]
  },
  data: {
    itemGroups: [...],
    items: [...],
    clientCustomers: [...],
    invoices: [...],
    payments: [...],
    purchaseHistory: [...]
  }
}
```

### Response Fields

| Field     | Description                            |
| --------- | -------------------------------------- |
| `summary` | Count of operations performed          |
| `synced`  | IDs of created/updated/deleted records |
| `data`    | Complete client dataset after sync     |

---

## Transaction Handling

### MongoDB Transactions

Sync operations use MongoDB sessions:

```javascript
const session = await mongoose.startSession();
await session.withTransaction(runSyncOperations);
```

**Benefits:**

- Atomic execution
- Automatic rollback on error
- Data consistency guaranteed

### Fallback for Non-Replica Sets

If MongoDB is not a replica set (local development):

```javascript
// Transaction not supported, run operations directly
if (
  error.message.includes(
    'Transaction numbers are only allowed on a replica set',
  )
) {
  await runSyncOperations();
}
```

---

## Offline Queue Strategy

### Client-Side Implementation

1. **Queue Operations**
   - Store failed/offline requests locally
   - Include: endpoint, method, body, timestamp, requestId

2. **Process Queue**
   - When online, batch into sync payload
   - Send to `/api/sync`
   - Clear queue on success

3. **Conflict Resolution**
   - Server timestamps are source of truth
   - `synced` IDs help map local to server records
   - `data` payload rebuilds local state

### Idempotency Header

```http
X-Idempotency-Key: <unique_request_id>
```

- Prevents duplicate operations on retry
- Server caches and returns same response
- Essential for unstable networks

---

## Error Handling

### Validation Errors

```javascript
// Missing required fields
'Item create at index 0 is missing name/price';
'Invoice create at index 0 missing products';
'Payment create at index 0 missing data';

// Invalid values
'Invoice product at index 0 must have quantity > 0';
'Payment create at index 0 must have amount > 0';
'Paid amount cannot be negative';
'Paid amount cannot exceed total amount';
'Payment exceeds outstanding balance';

// Not found
'Item not found for update: <id>';
'Item not found for delete: <id>';
'Invoice not found for payment: <id>';
```

### Transaction Rollback

On any error:

- All operations in the transaction are rolled back
- No partial sync state
- Error message returned to client
- Client can retry entire sync

---

## Data Normalization

Items returned in `data` are normalized:

```javascript
{
  ...item.toObject(),
  groupId: item.groupId?.toString() || null,
  dealerIds: item.dealerIds.map(id => id.toString()),
  productId: item._id.toString()
}
```

This ensures:

- IDs are strings, not ObjectIds
- Null handling is consistent
- Client receives predictable format

---

## Sync Workflow

```
Mobile App (Offline)
├── Create Item A → Queue
├── Create Invoice → Queue
├── Record Payment → Queue
└── Network Restored
    ↓
POST /api/readytosync
    ↓ (success)
POST /api/sync
    {
      item: { create: [Item A] },
      invoice: { create: [Invoice] },
      payment: { create: [Payment] }
    }
    ↓
Server Transaction
    ├── Create Item A ✓
    ├── Create Invoice ✓
    ├── Decrement Stock ✓
    ├── Record Payment ✓
    ├── Update Invoice.paidAmount ✓
    └── Create PurchaseHistory ✓
    ↓
Response
    {
      success: true,
      summary: { ... },
      synced: { ... },
      data: { /* full dataset */ }
    }
    ↓
Mobile App
    ├── Clear Queue
    └── Replace Local Data with Server Data
```

---

## Security Considerations

1. **Authentication Required**
   - JWT token validated on every sync
   - `clientId` extracted from token
   - No cross-client data access

2. **Ownership Validation**
   - All operations scoped to `clientId`
   - Cannot update/delete other clients' data
   - Server enforces ownership

3. **Input Validation**
   - All fields validated
   - Types checked
   - Bounds enforced

---

## Why This Design Works

- Offline-first enables field use without connectivity
- Atomic transactions prevent partial state
- Full data return eliminates drift
- Idempotency enables safe retries
- Single endpoint simplifies client logic

---

## Summary

The Sync Module is the **offline-first bridge** of Viveka.

- Queued operations sync atomically
- All-or-nothing transaction execution
- Full dataset returned after sync
- Client rebuilds state from server
- Idempotency prevents duplicates

If any future change allows partial sync state or cross-client data access, it is **architecturally incorrect**.

---

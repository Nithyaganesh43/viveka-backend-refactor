# Item & Item Group Module – Core Concept & System Rules

## Purpose

The Item & Item Group Module manages **products and inventory** for the client's business.

Items represent what the client sells. Item Groups organize items into categories.

This module is the **single source of truth** for:

- Product catalog
- Inventory levels (stock)
- Product categorization
- Dealer-item relationships

---

## Core Design Principles

1. **Items Exist Once**
   - Each item is a unique product
   - No duplicate items per client
   - Stock is global per item

2. **Groups Are Classification Only**
   - Item groups are for organization
   - No business logic tied to groups
   - Items can exist without a group

3. **Stock Belongs to Items**
   - Stock is a property of the item
   - Stock is not tied to dealers
   - Multiple dealers can supply the same item

4. **Soft Delete for Items**
   - Deleted items become inactive
   - Historical references preserved
   - Item data never truly lost

---

## Core Entity: Item Group

Organizes items into logical categories.

### Fields

| Field         | Description           |
| ------------- | --------------------- |
| `clientId`    | The owning client     |
| `name`        | Group name (required) |
| `description` | Optional description  |
| `createdAt`   | Creation timestamp    |
| `updatedAt`   | Last update timestamp |

### Purpose

- Visual organization in UI
- Filtering items by category
- Reporting by product type
- No pricing or stock logic

---

## Core Entity: Item

Represents a product the client sells or stocks.

### Required Fields

| Field      | Description       |
| ---------- | ----------------- |
| `clientId` | The owning client |
| `name`     | Product name      |
| `price`    | Selling price     |

### Inventory Fields

| Field              | Description                      |
| ------------------ | -------------------------------- |
| `stock`            | Current quantity (default: 0)    |
| `lowStockQuantity` | Alert threshold (default: 5)     |
| `unit`             | Unit of measure (default: 'nos') |

### Classification Fields

| Field         | Description                   |
| ------------- | ----------------------------- |
| `groupId`     | Optional item group reference |
| `description` | Optional product description  |

### Dealer Relationship

| Field       | Description                           |
| ----------- | ------------------------------------- |
| `dealerIds` | Array of dealers who supply this item |

### System Fields

| Field       | Description           |
| ----------- | --------------------- |
| `isActive`  | Soft delete flag      |
| `createdAt` | Creation timestamp    |
| `updatedAt` | Last update timestamp |

---

## Item Group Operations

### Create Item Group

- Requires `clientId` and `name`
- Description is optional
- Returns created group

### Get Item Groups

- Returns all groups for client
- No pagination
- No filtering

### Update Item Group

- Updates name and/or description
- Validates ownership
- Returns updated group

### Delete Item Group

- Hard delete (permanent)
- Items in group are NOT deleted
- Items retain orphaned `groupId`

**Note:** Consider nullifying `groupId` on items when group is deleted.

---

## Item Operations

### Create Item

**Required Input:**

- `clientId` — The owning client
- `name` — Product name
- `price` — Selling price

**Optional Input:**

| Field              | Default |
| ------------------ | ------- |
| `dealerIds`        | `[]`    |
| `stock`            | `0`     |
| `lowStockQuantity` | `5`     |
| `unit`             | `'nos'` |
| `groupId`          | `null`  |
| `description`      | `''`    |

**Response includes:**

```javascript
{
  success: true,
  item: {
    ...itemData,
    productId: "item_id_string"  // Convenience alias
  }
}
```

---

### Get Items

**Parameters:**

- `clientId` (required)
- `groupId` (optional filter)

**Behavior:**

- Returns only active items (`isActive: true`)
- Filters by group if provided
- Normalizes response:
  - `groupId` as string or null
  - `dealerIds` as string array
  - `productId` alias for `_id`

---

### Update Item

- Updates any provided fields
- Validates item exists and belongs to client
- Updates `updatedAt` timestamp
- Returns updated item

---

### Delete Item

- **Soft delete only**
- Sets `isActive: false`
- Item remains in database
- Historical references preserved
- Returns success message

---

## Dealer ↔ Item Relationship

Items can be supplied by multiple dealers.

```javascript
item: {
  dealerIds: ['dealer1_id', 'dealer2_id'];
}
```

### Rules

1. **Many-to-Many Mapping**
   - A dealer can supply many items
   - An item can be supplied by many dealers

2. **No Stock Impact**
   - Dealer mapping doesn't affect stock
   - Stock changes only on dealer order delivery

3. **Validation Only**
   - Used to validate dealer orders
   - Shows which dealers supply which items
   - Enables dealer-specific item views

---

## Stock Management Rules

### Stock is Global

- One stock value per item
- Same stock regardless of which dealer supplied it
- Stock is client-owned, not dealer-owned

### Stock Changes Only On

1. **Dealer Order Delivery**
   - When order status changes to `delivered`
   - Stock increases by ordered quantity
   - This is the ONLY way stock increases

2. **Invoice Creation**
   - When items are sold
   - Stock decreases by sold quantity
 
### Low Stock Alert

- `lowStockQuantity` sets threshold
- Items with `stock <= lowStockQuantity` trigger alerts
- Used for reorder notifications

---

## Response Normalization

Items are normalized for consistent API response:

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
- Client apps receive predictable format

---

## Data Integrity Rules

1. **Client Ownership**
   - All items belong to one client
   - All groups belong to one client
   - No cross-client access

2. **Active Filter Default**
   - Get operations return active items only
   - Inactive items are "deleted" from view
   - Historical queries may include inactive

3. **Reference Preservation**
   - Deleted items keep their data
   - Invoice references remain valid
   - Audit trail is maintained

4. **Group Independence**
   - Deleting group doesn't delete items
   - Items can exist without group
   - Group is purely organizational

---

## Why This Design Works

- Single item record prevents duplication
- Soft delete preserves history
- Many-to-many dealer mapping is flexible
- Stock is centralized and consistent
- Groups provide organization without complexity

---

## Summary

The Item & Item Group Module is the **product catalog and inventory layer** of Viveka.

- Items are unique products owned by a client
- Item Groups provide optional categorization
- Stock is global per item, not per dealer
- Dealers are linked for procurement, not ownership
- Soft delete ensures historical integrity

If any future change creates duplicate items or dealer-owned stock, it is **architecturally incorrect**.

---

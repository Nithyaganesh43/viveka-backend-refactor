# Client Customer Module – Core Concept & System Rules

## Purpose

The Client Customer Module manages **customers of the business** — the people who purchase goods or services from the client.

Client Customers are **not users of the system**. They are records representing external buyers.

This module is the **single source of truth** for:

- Customer identity and contact information
- Customer purchase history linkage
- Invoice and payment attribution

---

## Core Design Principles

1. **Phone Number is Primary Key**
   - Each customer is uniquely identified by phone number per client
   - No duplicate phone numbers within a client's customer base
   - Phone number enables customer lookup and deduplication

2. **Automatic Deduplication**
   - Creating a customer with existing phone updates the record
   - No duplicate customers are ever created
   - Name and details can be updated on re-creation

3. **Flexible Field Requirements**
   - Base fields: name and phone only
   - Additional fields controlled by client settings
   - Settings determine which fields are mandatory

4. **Customers Enable Attribution**
   - Invoices link to customers
   - Purchase history tracks customer activity
   - Payments can be associated with customers

---

## Core Entity: Client Customer

Represents a buyer/customer of the client's business.

### Required Fields

| Field         | Description                      |
| ------------- | -------------------------------- |
| `clientId`    | The owning client                |
| `name`        | Customer name (min 2 chars)      |
| `phoneNumber` | Unique phone within client scope |

### Conditional Fields

These fields may be **required** based on client settings:

| Field     | Description         |
| --------- | ------------------- |
| `address` | Customer address    |
| `emailId` | Customer email      |
| `gstNo`   | Customer GST number |

### System Fields

| Field       | Description               |
| ----------- | ------------------------- |
| `createdAt` | Record creation timestamp |
| `updatedAt` | Last update timestamp     |

---

## Name Sanitization Rules

Customer names are sanitized before storage:

1. Whitespace is trimmed
2. Names shorter than 2 characters default to "clientCustomer"
3. Empty names are not allowed

This ensures meaningful customer records even with minimal input.

---

## Operations

### Create Client Customer

**Required Input:**

- `clientId` — The owning client
- `name` — Customer name
- `phone` — Customer phone number

**Optional Input:**

- `address` — Customer address
- `emailId` — Customer email
- `gstNo` — Customer GST number

**Behavior:**

1. Check client exists
2. Validate required fields based on client settings
3. If phone exists → update existing record
4. If phone is new → create new record
5. Return customer with `isNew` flag

**Response includes:**

```javascript
{
  success: true,
  clientCustomer: { /* customer object */ },
  isNew: true | false
}
```

---

### Get Client Customers

Returns all customers for a client.

- Sorted by creation date (newest first)
- No pagination (full list)
- Active and inactive customers included

---

### Get Customer by Phone

Lookup a specific customer by phone number.

- Exact phone match required
- Returns single customer or null
- Useful for point-of-sale scenarios

---

### Update Client Customer

- Updates specified fields only
- Validates customer exists and belongs to client
- Updates `updatedAt` timestamp
- Returns updated customer

---

### Delete Client Customer

- Hard delete (permanent removal)
- Validates ownership before deletion
- Historical references may become orphaned

**Warning:** Consider soft delete for audit purposes.

---

## Field Requirement Enforcement

Client settings control which fields are mandatory:

```javascript
// Client Settings
customerFields: {
  address: true,   // Address is required
  gstNo: false,    // GST is optional
  emailId: true    // Email is required
}
```

**Enforcement Logic:**

1. Fetch client settings
2. Check each enabled field
3. Throw error if required field is missing

This allows each business to enforce their own data quality requirements.

---

## Auto-Create on Invoice

When creating an invoice, customers can be auto-created:

1. If `clientCustomerId` is provided → use existing
2. If only phone is provided → find or create customer
3. Customer is linked to invoice automatically

This simplifies point-of-sale workflows.

---

## Client Customer ↔ Invoice Relationship

```
Client Customer
├── Invoice 1
├── Invoice 2
└── Invoice N
```

- One customer can have many invoices
- Invoices store `clientCustomerId` reference
- Customer deletion does not delete invoices

---

## Client Customer ↔ Purchase History

Purchase history tracks customer activity:

- Links customer to their purchases
- Provides transaction timeline
- Enables customer insights and reports

---

## Data Integrity Rules

1. **Phone Uniqueness**
   - Phone must be unique per client
   - Same phone can exist for different clients
   - Enforced at database level

2. **Client Ownership**
   - Customer belongs to exactly one client
   - All operations validate client ownership
   - No cross-client customer access

3. **Reference Safety**
   - Deleting customer may orphan invoice references
   - Consider soft delete for production
   - Historical data should be preserved

---

## Why This Design Works

- Phone-based deduplication prevents duplicates
- Flexible field requirements support different businesses
- Auto-create simplifies checkout workflows
- Clear ownership model ensures data isolation
- Simple API covers all use cases

---

## Summary

The Client Customer Module is the **customer management layer** of Viveka.

- Customers are identified by phone number
- Duplicate creation updates existing records
- Field requirements are configurable
- Customers link to invoices and purchase history

If any future change allows duplicate customers per phone, it is **architecturally incorrect**.

---

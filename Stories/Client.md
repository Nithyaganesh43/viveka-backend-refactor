# Client Module – Core Concept & System Rules

## Purpose

The Client Module represents the **business owner** who uses the Viveka system. A client is the central entity around which all business operations revolve.

This module is the **single source of truth** for:

- Business identity and profile
- Client settings and preferences
- Ownership of all business data (items, customers, invoices, etc.)

---

## Core Design Principles

1. **Client Owns Everything**
   - All business entities belong to a client
   - Items, customers, invoices, dealers — all scoped by `clientId`
   - No data exists without a client owner

2. **Identity is Immutable**
   - Phone number is the unique identifier
   - Phone number cannot be changed after registration
   - All authentication flows use phone number

3. **Profile is Mutable**
   - Business details can be updated
   - Settings can be customized
   - Only allowed fields can be modified

4. **Settings Drive Behavior**
   - Client settings control feature behavior
   - Customer field requirements are configurable
   - Settings are always returned with defaults merged

---

## Core Entity: Client

Represents a business owner using Viveka.

### Required Fields

| Field          | Description                   |
| -------------- | ----------------------------- |
| `phoneNumber`  | Unique identifier (immutable) |
| `ownerName`    | Name of the business owner    |
| `businessName` | Name of the business          |

### Optional Profile Fields

| Field        | Description               |
| ------------ | ------------------------- |
| `shopName`   | Display name of the shop  |
| `location`   | Street/area location      |
| `city`       | City name                 |
| `state`      | State name                |
| `gstin`      | GST Identification Number |
| `profileUrl` | Profile image URL         |

### System Fields

| Field            | Description                     |
| ---------------- | ------------------------------- |
| `isActive`       | Account active status           |
| `lastLoginAt`    | Last successful login timestamp |
| `createdAt`      | Account creation timestamp      |
| `updatedAt`      | Last profile update timestamp   |
| `clientSettings` | Configurable business settings  |

---

## Client Settings

Client settings control how certain features behave.

### Customer Field Settings

Controls which fields are **required** when creating a client customer.

```javascript
customerFields: {
  address: false,   // Is address required?
  gstNo: false,     // Is GST number required?
  emailId: false    // Is email required?
}
```

Default: All fields are optional.

When a setting is `true`, the corresponding field becomes **mandatory** for customer creation.

---

## Operations

### Get Client Details

- Retrieves complete client profile
- Excludes sensitive fields (password hash)
- Returns settings with defaults merged
- Always returns a consistent settings structure

### Update Client Profile

Allowed update fields:

- `ownerName`
- `businessName`
- `shopName`
- `location`
- `city`
- `state`
- `gstin`
- `profileUrl`
- `clientSettings`

**Not Allowed:**

- `phoneNumber` (immutable)
- `_id` (system generated)
- `createdAt` (system managed)

---

## Settings Update Rules

1. **Partial Updates Allowed**
   - Only provided fields are updated
   - Missing fields retain existing values

2. **Customer Fields Sanitization**
   - Only known keys are accepted
   - Values are coerced to boolean
   - Unknown keys are ignored

3. **Settings Always Merged**
   - Response always contains full settings
   - Missing settings use defaults
   - No partial settings in response

---

## Client Lifecycle

### 1. Registration

- Phone number must be unique
- OTP verification required
- Initial device session created
- JWT token issued

### 2. Active Usage

- Profile can be updated
- Settings can be customized
- All business operations available

### 3. Account Status

- `isActive: true` → Full access
- `isActive: false` → Login blocked

---

## Client ↔ Business Data Relationship

All business entities are scoped to a client:

```
Client
├── Items
├── Item Groups
├── Client Customers
├── Invoices
├── Carts
├── Dealers
├── Dealer Orders
├── Payments
└── Purchase History
```

**Rule:** Deleting a client would orphan all related data. Client deletion is not supported.

---

## Security Model

1. **Phone-Based Identity**
   - Phone number is the primary identifier
   - No username/password authentication
   - OTP-only authentication

2. **Token-Based Access**
   - JWT tokens for API access
   - Token contains `clientId` and `deviceSessionId`
   - Single active device policy enforced

3. **Data Isolation**
   - All queries filtered by `clientId`
   - No cross-client data access possible
   - Middleware validates client ownership

---

## Why This Design Works

- Phone as identity is simple and universal
- Settings system is extensible
- Profile updates are safe and controlled
- Data isolation is guaranteed
- Client is the natural ownership boundary

---

## Summary

The Client Module is the **identity and ownership layer** of Viveka.

- Clients own all business data
- Phone number is the immutable identity
- Profile and settings are customizable
- All access is authenticated and scoped

If any future change allows cross-client data access, it is **architecturally incorrect**.

---

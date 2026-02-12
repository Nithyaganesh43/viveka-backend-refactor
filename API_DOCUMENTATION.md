# Viveka Backend - API Documentation

**Version:** 1.0.0  
**Base URL:** `https://viveha-backend.onrender.com/api`  
**Protocol:** HTTPS  
**Format:** JSON

---

## 📑 Table of Contents

- [Getting Started](#-getting-started)
- [Authentication](#-authentication)
- [OTP Endpoints](#-otp-endpoints)
- [Authentication Endpoints](#-authentication-endpoints)
  - [Register Client](#1-register-client)
  - [Login Client](#2-login-client)
  - [Logout Client](#3-logout-client)
- [Client Profile Management](#-client-profile-management)
  - [Client Settings & Configuration](#️-client-settings--configuration)
  - [Get Client Profile](#4-get-client-profile)
  - [Update Client Profile](#5-update-client-profile)
  - [Update Customer Field Settings](#6-update-customer-field-settings)
- [Business Endpoints](#-business-endpoints)
  - [Item Groups](#item-groups)
  - [Items](#items)
  - [Dealers](#dealers)
  - [Client Customers](#client-customers)
  - [Cart Management](#cart-management)
  - [Invoices & Payments](#invoices--payments)
  - [Reports](#reports)
  - [Dashboard](#dashboard)
- [Sync (Offline)](#sync-offline)
- [System](#system)
- [Error Handling](#️-error-handling)
- [Rate Limiting](#-rate-limiting)
- [Security](#️-security)
- [Idempotency](#-idempotency)

---

## 🚀 Getting Started

### Base URL

````
Production: https://viveha-backend.onrender.com/api
Development: http://localhost:10000/api
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "clientCustomerId": "607f1f77bcf86cd799439030",
  "products": [
    {
      "productId": "507f1f77bcf86cd799439099",
      "quantity": 2
    }
  ],
  "totalAmount": 1000,
  "paidAmount": 1000,
  "notes": "Invoice generated with direct products array"
}
````

| Code  | Description           | Usage                                   |
| ----- | --------------------- | --------------------------------------- |
| `200` | OK                    | Successful GET, PUT, DELETE             |
| `201` | Created               | Successful POST (resource created)      |
| `400` | Bad Request           | Validation error, missing fields        |
| `401` | Unauthorized          | Authentication failed                   |
| `404` | Not Found             | Resource doesn't exist                  |
| `409` | Conflict              | Duplicate resource (e.g., phone number) |
| `500` | Internal Server Error | Server-side error                       |

### Common Request Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>        # For protected routes
X-Idempotency-Key: <unique_request_id>   # For mutation safety
```

---

## 🔐 Authentication

Viveka uses **OTP-based authentication** with JWT tokens.

### Authentication Flow

```
1. Request OTP    → POST /otp/send (production) or POST /mockotp/send (testing)
2. Register/Login → POST /auth/register or POST /auth/login (OTP validated automatically)
3. Receive JWT    → Use token for protected routes
```

### JWT Token

- **Expiry:** 7 days
- **Algorithm:** HS256
- **Payload:** `{ clientId, deviceSessionId, iat, exp }`

**Usage:**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📧 OTP Endpoints

### 1. Send OTP

Send OTP to phone number via SMS.

**Endpoint:** `POST /otp/send`

**Purpose:** Initiate OTP verification for registration or login.

**Authentication:** None

#### Request Body

```json
{
  "phoneNumber": "9890000000",
  "purpose": "register" // "register" | "login"
}
```

#### Request Parameters

| Field         | Type   | Required | Description          | Constraints              |
| ------------- | ------ | -------- | -------------------- | ------------------------ |
| `phoneNumber` | string | ✅       | User's mobile number | 10+ digits, numeric only |
| `purpose`     | string | ✅       | OTP purpose          | `register` or `login`    |

#### Success Response (200)

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phoneNumber": "9890000000",
  "expiresInSeconds": 600
}
```

#### Error Responses

**400 - Missing Phone Number**

```json
{
  "success": false,
  "message": "Phone number is required"
}
```

**400 - Already Registered (purpose: register)**

```json
{
  "success": false,
  "message": "Phone number already registered. Please login instead."
}
```

**404 - Not Registered (purpose: login)**

```json
{
  "success": false,
  "message": "Phone number not registered. Please register first."
}
```

#### Flow Diagram

```mermaid
sequenceDiagram
    participant App
    participant API
    participant OTPSvc
    participant SMS

    App->>API: POST /otp/send
    API->>OTPSvc: Generate OTP
    OTPSvc->>OTPSvc: Hash with bcrypt
    OTPSvc->>MongoDB: Store OTPSession (TTL: 10min)
    OTPSvc->>SMS: Send via 2factor.in
    SMS-->>User: SMS Delivery
    OTPSvc-->>API: Success
    API-->>App: {success: true}
```

#### Constraints & Business Rules

- **OTP Validity:** 10 minutes (600 seconds)
- **Attempt Limit:** 5 verification attempts per OTP
- **Rate Limiting:** 3 OTP requests per phone number per hour
- **Single-Use:** OTP consumed after successful verification
- **Purpose Isolation:** Register OTPs cannot be used for login and vice versa

#### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9890000000",
    "purpose": "register"
  }'
```

---

### 1b. Send Mock OTP (Testing Only)

Send a **fixed mock OTP** (no SMS) for local/dev testing.

**Endpoint:** `POST /mockotp/send`

**Purpose:** Initiate OTP verification for registration or login without sending SMS.

**Authentication:** None

#### Request Body

```json
{
  "phoneNumber": "9890000000",
  "purpose": "register" // "register" | "login"
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phoneNumber": "9890000000",
  "expiresInSeconds": 600
}
```

#### Notes

- Returns a fixed OTP code: **123456**.
- Does not send SMS.
- Intended for **testing only**.
- Only available in development environment (`NODE_ENV !== 'production'`).

#### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/mockotp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9890000000",
    "purpose": "register"
  }'
```

---

### 2. Clear OTP Session

Clear/reset OTP session (testing utility).

**Endpoint:** `POST /otp/clear`

**Purpose:** Remove OTP session for re-testing.

**Authentication:** None

**⚠️ Note:** Should be disabled in production.

#### Request Body

```json
{
  "phoneNumber": "9890000000"
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "OTP session cleared successfully"
}
```

#### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/otp/clear \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9890000000"}'
```

---

## 👤 Authentication Endpoints

### 1. Register Client

Register a new business client (shop owner).

**Endpoint:** `POST /auth/register`

**Purpose:** Create new client account with business profile.

**Authentication:** None (requires valid OTP)

#### Request Body

```json
{
  "phoneNumber": "9890000000",
  "otp": "123456",
  "ownerName": "Alice Johnson",
  "businessName": "Alice Auto Spares",
  "deviceId": "device-001-unique-id", // Optional
  "shopName": "Alice's Shop", // Optional
  "location": "123 Main Street, Downtown", // Optional
  "city": "Bangalore", // Optional
  "state": "Karnataka", // Optional
  "gstin": "18AADCA1111K1Z5", // Optional
  "profileUrl": "https://example.com/logo.png" // Optional
}
```

#### Request Parameters

| Field          | Type   | Required | Description       | Validation         |
| -------------- | ------ | -------- | ----------------- | ------------------ |
| `phoneNumber`  | string | ✅       | Business phone    | 10+ digits, unique |
| `otp`          | string | ✅       | OTP code          | 6 digits           |
| `ownerName`    | string | ✅       | Owner's name      | Min 3 chars        |
| `businessName` | string | ✅       | Business name     | Min 3 chars        |
| `deviceId`     | string | ❌       | Device identifier | Default provided   |
| `shopName`     | string | ❌       | Display name      | Max 100 chars      |
| `location`     | string | ❌       | Full address      | Max 500 chars      |
| `city`         | string | ❌       | City name         | Max 50 chars       |
| `state`        | string | ❌       | State name        | Max 50 chars       |
| `gstin`        | string | ❌       | GST number        | GST format         |
| `profileUrl`   | string | ❌       | Logo URL          | Valid URL          |

#### Success Response (201)

```json
{
  "success": true,
  "message": "Client registered successfully",
  "clientId": "507f1f77bcf86cd799439011",
  "phoneNumber": "9890000000",
  "ownerName": "Alice Johnson",
  "businessName": "Alice Auto Spares",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceSessionId": "607f1f77bcf86cd799439012"
}
```

#### Error Responses

**400 - Missing Required Fields**

```json
{
  "success": false,
  "message": "Phone number, otp, owner name, and business name are required"
}
```

**400 - Invalid OTP**

```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**409 - Phone Already Registered**

```json
{
  "success": false,
  "message": "Phone number already registered"
}
```

#### Flow Diagram

```mermaid
sequenceDiagram
    participant App
    participant API
    participant AuthSvc
    participant OTPSvc
    participant DB

    App->>API: POST /auth/register
    API->>AuthSvc: Validate request
    AuthSvc->>OTPSvc: Verify OTP
    OTPSvc->>DB: Check OTPSession
    alt OTP Valid
        OTPSvc-->>AuthSvc: Verified
        AuthSvc->>DB: Check phone uniqueness
        alt Phone Available
            AuthSvc->>DB: Create Client
            DB-->>AuthSvc: clientId
            AuthSvc->>DB: Delete OTPSession
            AuthSvc-->>API: Success
            API-->>App: {clientId}
        else Phone Exists
            AuthSvc-->>API: Conflict
            API-->>App: {success: false}
        end
    else OTP Invalid
        OTPSvc-->>AuthSvc: Failed
        AuthSvc-->>API: Unauthorized
        API-->>App: {success: false}
    end
```

#### Constraints

- **Phone Number:** Must be unique across all clients
- **OTP Required:** Must have valid, unexpired OTP for registration
- **OTP Consumed:** OTP is deleted after successful registration
- **Immutability:** Phone number cannot be changed after registration

#### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9890000000",
    "otp": "123456",
    "ownerName": "Alice Johnson",
    "businessName": "Alice Auto Spares",
    "deviceId": "device-001-unique-id",
    "shopName": "Alice Auto Spares",
    "location": "123 Main Street, Downtown Area",
    "city": "Bangalore",
    "state": "Karnataka",
    "gstin": "18AADCA1111K1Z5",
    "profileUrl": "https://example.com/logo.png"
  }'
```

---

### 2. Login Client

Authenticate existing client and create session.

**Endpoint:** `POST /auth/login`

**Purpose:** Login to existing account using OTP.

**Authentication:** None (requires valid OTP)

#### Request Body

```json
{
  "phoneNumber": "9890000000",
  "otp": "4321",
  "deviceId": "device-001-unique-id" // Optional
}
```

#### Request Parameters

| Field         | Type   | Required | Description                  |
| ------------- | ------ | -------- | ---------------------------- |
| `phoneNumber` | string | ✅       | Registered phone number      |
| `otp`         | string | ✅       | 6-digit OTP (purpose: login) |
| `deviceId`    | string | ❌       | Device identifier            |

#### Success Response (200)

```json
{
  "success": true,
  "message": "OTP login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImRldmljZVNlc3Npb25JZCI6IjYwN2YxZjc3YmNmODZjZDc5OTQzOTAxMiIsImlhdCI6MTY4NzUzMDAwMCwiZXhwIjoxNjkwMTIyMDAwfQ.abc123",
  "clientId": "507f1f77bcf86cd799439011",
  "deviceSessionId": "607f1f77bcf86cd799439012",
  "phoneNumber": "9890000000"
}
```

#### Error Responses

**401 - Invalid Credentials**

```json
{
  "success": false,
  "message": "Client login failed: OTP not found. Please request a new OTP"
}
```

**400 - Account Inactive**

```json
{
  "success": false,
  "message": "Account is not active"
}
```

**404 - Phone Not Registered**

```json
{
  "success": false,
  "message": "Phone number not registered. Please register first."
}
```

#### Flow Diagram

```mermaid
sequenceDiagram
    participant App
    participant API
    participant AuthSvc
    participant OTPSvc
    participant DB

    App->>API: POST /auth/login
    API->>AuthSvc: Process login
    AuthSvc->>OTPSvc: Verify OTP
    OTPSvc->>DB: Check OTPSession
    alt OTP Valid
        OTPSvc-->>AuthSvc: Verified
        AuthSvc->>DB: Find Client by phone
        alt Client Found & Active
            AuthSvc->>DB: Invalidate old DeviceSession
            AuthSvc->>DB: Create new DeviceSession
            DB-->>AuthSvc: deviceSessionId
            AuthSvc->>AuthSvc: Generate JWT (30d)
            AuthSvc->>DB: Update lastLoginAt
            AuthSvc->>DB: Delete OTPSession
            AuthSvc-->>API: Success with token
            API-->>App: {token, clientId, deviceSessionId}
        else Client Inactive
            AuthSvc-->>API: Forbidden
            API-->>App: {success: false}
        end
    else OTP Invalid
        OTPSvc-->>AuthSvc: Failed
        AuthSvc-->>API: Unauthorized
        API-->>App: {success: false}
    end
```

#### Constraints

- **Single-Device Policy:** Previous device sessions invalidated on new login
- **JWT Expiry:** 7 days from login
- **OTP Consumed:** OTP deleted after successful login
- **Session Tracking:** DeviceSession tracks last active device

#### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9890000000",
    "otp": "4321",
    "deviceId": "device-001-unique-id"
  }'
```

---

### 3. Logout Client

Terminate current session.

**Endpoint:** `POST /auth/logout`

**Purpose:** Invalidate device session and logout.

**Authentication:** Bearer Token (JWT required)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{}
```

**Note:** `clientId` and `deviceSessionId` are extracted from the JWT token automatically.

#### Success Response (200)

```json
{
  "success": true,
  "message": "Logout successful",
  "deviceSessionId": "607f1f77bcf86cd799439012"
}
```

#### Error Response (400)

```json
{
  "success": false,
  "message": "Device session ID is required"
}
```

#### Flow

1. Extract clientId and deviceSessionId from JWT token
2. Deactivate DeviceSession in database
3. Client should discard JWT token locally

#### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/auth/logout \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 👤 Client Profile Management

**Authentication Required:** All client profile endpoints require Bearer Token authentication.

```http
Authorization: Bearer <jwt_token>
```

Client profile management allows clients to:

- **View Profile**: Retrieve business information and settings
- **Update Profile**: Modify business details (name, location, GST, etc.)
- **Configure Settings**: Control customer data collection preferences

**Available Endpoints:**

- `GET /auth/client/:clientId` - Retrieve client profile
- `PUT /auth/client/:clientId` - Update profile or settings

**Note:** Client profile routes are available at both:

- `/api/client/:clientId` (primary)
- `/api/auth/client/:clientId` (backward compatible)

---

## 🎛️ Client Settings & Configuration

### Overview

Viveka allows each business client to configure **which optional fields** they want to collect from their customers. This is controlled through `clientSettings.customerFields`.

### What are Client Settings?

Client Settings provide **feature toggles** that control data collection preferences for each business:

```json
{
  "clientSettings": {
    "customerFields": {
      "address": false, // Can store customer addresses?
      "gstNo": false, // Can store customer GST numbers?
      "emailId": false // Can store customer email addresses?
    }
  }
}
```

### Purpose

Different businesses have different needs:

| Business Type        | Typical Settings                 | Reason                                  |
| -------------------- | -------------------------------- | --------------------------------------- |
| **Retail Shop**      | All `false`                      | Only needs name + phone for billing     |
| **B2B Supplier**     | `gstNo: true`, `emailId: true`   | Needs GST compliance and email invoices |
| **Service Provider** | `address: true`, `emailId: true` | Needs location for service delivery     |
| **Wholesaler**       | All `true`                       | Full customer details for invoicing     |

### Default Values

When a client registers, all fields default to `false`:

```json
{
  "customerFields": {
    "address": false,
    "gstNo": false,
    "emailId": false
  }
}
```

### How It Works

1. **Configuration**: Client updates settings via `PUT /auth/client/:clientId`
2. **API Behavior**: Backend **always accepts** all customer fields regardless of settings
3. **Frontend Guidance**: Settings guide which input fields to show in the UI
4. **Data Persistence**: All provided customer data is saved, even if corresponding setting is `false`

### Important Notes

✅ **Settings are per-client**: Each business configures independently  
✅ **Not validation rules**: API accepts all fields; settings guide UI/UX  
✅ **Retroactive**: Changing settings doesn't affect existing customer data  
✅ **Flexible**: Can be updated anytime via client profile update

### Example Workflow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB

    Client->>API: Register new business
    API->>DB: Create client with default settings (all false)
    Client->>API: Update settings: {address: true, gstNo: true}
    API->>DB: Update clientSettings.customerFields
    Note over Client: Frontend now shows address & GST inputs
    Client->>API: Create customer with address + GST
    API->>DB: Save customer with all provided fields
```

### Configuration Endpoints

- **View Settings**: `GET /auth/client/:clientId` - Returns current settings
- **Update Settings**: `PUT /auth/client/:clientId` - Modify settings

---

### 4. Get Client Profile

Retrieve client details by ID.

**Endpoint:** `GET /auth/client/:clientId`

**Purpose:** Fetch client profile information.

**Authentication:** Bearer Token (JWT required)

#### Path Parameters

| Parameter  | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| `clientId` | string | ✅       | MongoDB ObjectId of client |

#### Success Response (200)

```json
{
  "success": true,
  "client": {
    "_id": "507f1f77bcf86cd799439011",
    "phoneNumber": "9890000000",
    "ownerName": "Alice Johnson",
    "businessName": "Alice Auto Spares",
    "shopName": "Alice's Shop",
    "location": "123 Main Street, Downtown",
    "city": "Bangalore",
    "state": "Karnataka",
    "gstin": "18AADCA1111K1Z5",
    "profileUrl": "https://example.com/logo.png",
    "clientSettings": {
      "customerFields": {
        "address": false,
        "gstNo": false,
        "emailId": false
      }
    },
    "isActive": true,
    "createdAt": "2025-01-12T10:00:00.000Z",
    "lastLoginAt": "2025-01-12T12:30:00.000Z"
  }
}
```

#### Error Response (404)

```json
{
  "success": false,
  "message": "Client not found"
}
```

#### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/auth/client/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <jwt_token>"
```

---

### 5. Update Client Profile

Update client business profile details (name, location, GST, etc.).

**Endpoint:** `PUT /auth/client/:clientId`

**Purpose:** Modify client profile information.

**Authentication:** Bearer Token (JWT required)

**Note:** To configure customer field settings, see [Update Customer Field Settings](#6-update-customer-field-settings).

#### Path Parameters

| Parameter  | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| `clientId` | string | ✅       | MongoDB ObjectId of client |

#### Request Body

```json
{
  "ownerName": "Alice Johnson Updated",
  "businessName": "Alice Auto Spares Ltd",
  "shopName": "Alice's Premium Shop",
  "location": "456 New Street, Premium Area",
  "city": "Mumbai",
  "state": "Maharashtra",
  "gstin": "22ABCDE1234F1Z5",
  "profileUrl": "https://example.com/new-logo.png"
}
```

#### Request Parameters

| Field          | Type   | Required | Description       | Constraints   |
| -------------- | ------ | -------- | ----------------- | ------------- |
| `ownerName`    | string | ❌       | Owner's name      | Min 3 chars   |
| `businessName` | string | ❌       | Business name     | Min 3 chars   |
| `shopName`     | string | ❌       | Shop display name | Max 100 chars |
| `location`     | string | ❌       | Full address      | Max 500 chars |
| `city`         | string | ❌       | City name         | Max 50 chars  |
| `state`        | string | ❌       | State name        | Max 50 chars  |
| `gstin`        | string | ❌       | GST number        | GST format    |
| `profileUrl`   | string | ❌       | Logo URL          | Valid URL     |

**Note:** Phone number is **immutable** and cannot be updated.

#### Success Response (200)

```json
{
  "success": true,
  "message": "Client updated successfully",
  "client": {
    "_id": "507f1f77bcf86cd799439011",
    "phoneNumber": "9890000000",
    "ownerName": "Alice Johnson Updated",
    "businessName": "Alice Auto Spares Ltd",
    "shopName": "Alice's Premium Shop",
    "city": "Mumbai",
    "updatedAt": "2025-01-12T14:00:00.000Z"
  }
}
```

#### Error Responses

**400 - No Updates Provided**

```json
{
  "success": false,
  "message": "No updates provided"
}
```

**404 - Client Not Found**

```json
{
  "success": false,
  "message": "Client not found"
}
```

#### cURL Example

```bash
curl -X PUT https://viveha-backend.onrender.com/api/auth/client/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "ownerName": "Alice Johnson Updated",
    "city": "Mumbai"
  }'
```

---

### 6. Update Customer Field Settings

Configure which optional fields are enabled for client customers.

**Endpoint:** `PUT /auth/client/:clientId`

**Purpose:** Enable or disable customer data collection fields (address, GST number, email).

**Authentication:** Bearer Token (JWT required)

#### What This Controls

This endpoint allows you to configure `customerFields` settings that control which optional information can be collected from your customers:

- **`address`** - Enable/disable customer address collection
- **`gstNo`** - Enable/disable customer GST number collection
- **`emailId`** - Enable/disable customer email address collection

**Default State:** All fields are `false` (disabled) when a client registers.

**Use Cases:**

- **B2B Business**: Enable `gstNo` and `emailId` for compliance
- **Retail Shop**: Keep all disabled (only need name + phone)
- **Service Business**: Enable `address` for delivery locations

#### Path Parameters

| Parameter  | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| `clientId` | string | ✅       | MongoDB ObjectId of client |

#### Request Body

```json
{
  "clientSettings": {
    "customerFields": {
      "address": true,
      "gstNo": true,
      "emailId": false
    }
  }
}
```

#### Request Parameters

| Field                                   | Type    | Required | Description                         | Default |
| --------------------------------------- | ------- | -------- | ----------------------------------- | ------- |
| `clientSettings.customerFields.address` | boolean | ❌       | Enable customer address field       | `false` |
| `clientSettings.customerFields.gstNo`   | boolean | ❌       | Enable customer GST number field    | `false` |
| `clientSettings.customerFields.emailId` | boolean | ❌       | Enable customer email address field | `false` |

**Partial Updates Supported:** You can update individual fields without sending all three.

#### Success Response (200)

```json
{
  "success": true,
  "client": {
    "_id": "507f1f77bcf86cd799439011",
    "phoneNumber": "9890000000",
    "ownerName": "Alice Johnson",
    "businessName": "Alice Auto Spares",
    "clientSettings": {
      "customerFields": {
        "address": true,
        "gstNo": true,
        "emailId": false
      }
    },
    "updatedAt": "2025-01-12T14:00:00.000Z"
  }
}
```

#### Error Responses

**400 - No Updates Provided**

```json
{
  "success": false,
  "message": "No updates provided"
}
```

**404 - Client Not Found**

```json
{
  "success": false,
  "message": "Client not found"
}
```

#### Important Behavior Notes

**Feature Toggle (Not Validation):**

- Settings act as **UI guidance**, not API validation rules
- The API accepts all customer fields regardless of these settings
- When a field is `false`: Frontend should hide/disable that input
- When a field is `true`: Frontend should show/enable that input
- Backend persists all provided customer data regardless of settings

**Flexibility:**

- Update one field: `{"clientSettings": {"customerFields": {"address": true}}}`
- Update multiple: `{"clientSettings": {"customerFields": {"address": true, "gstNo": true}}}`
- Unspecified fields keep their current values
- All values are coerced to boolean (`true`/`false`)

**Independence:**

- Each client has isolated settings
- Changing settings doesn't affect existing customer data
- Settings can be updated anytime

**Future-Proof:**

- Additional settings fields may be added in future versions
- Currently supports only `customerFields`
- More configuration options planned (invoicing, tax, payment methods, etc.)

#### cURL Example

```bash
# Enable address and GST fields
curl -X PUT https://viveha-backend.onrender.com/api/auth/client/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "clientSettings": {
      "customerFields": {
        "address": true,
        "gstNo": true,
        "emailId": false
      }
    }
  }'

# Enable only address field (partial update)
curl -X PUT https://viveha-backend.onrender.com/api/auth/client/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "clientSettings": {
      "customerFields": {
        "address": true
      }
    }
  }'
```

---

## 🏢 Business Endpoints

**Note:** All business endpoints require Bearer Token authentication.

```http
Authorization: Bearer <jwt_token>
```

### Item Groups

Item groups are categories for organizing inventory items.

---

#### 1. Create Item Group

**Endpoint:** `POST /business/item-groups`

**Purpose:** Create a new category for items.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "name": "Engine Parts",
  "description": "All engine-related spare parts"
}
```

##### Request Parameters

| Field         | Type   | Required | Description       | Constraints    |
| ------------- | ------ | -------- | ----------------- | -------------- |
| `clientId`    | string | ✅       | Client's ObjectId | Valid ObjectId |
| `name`        | string | ✅       | Group name        | Min 2 chars    |
| `description` | string | ❌       | Description       | Max 500 chars  |

##### Success Response (201)

```json
{
  "success": true,
  "message": "Item group created successfully",
  "data": {
    "itemGroup": {
      "_id": "507f1f77bcf86cd799439013",
      "clientId": "507f1f77bcf86cd799439011",
      "name": "Engine Parts",
      "description": "All engine-related spare parts",
      "createdAt": "2025-01-12T10:00:00.000Z",
      "updatedAt": "2025-01-12T10:00:00.000Z"
    }
  }
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/item-groups \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "name": "Engine Parts",
    "description": "All engine-related spare parts"
  }'
```

---

#### 2. Get All Item Groups

**Endpoint:** `GET /business/item-groups/:clientId`

**Purpose:** Retrieve all item groups for a client.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "data": {
    "itemGroups": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "clientId": "507f1f77bcf86cd799439011",
        "name": "Engine Parts",
        "description": "All engine-related spare parts",
        "createdAt": "2025-01-12T10:00:00.000Z",
        "updatedAt": "2025-01-12T10:00:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "clientId": "507f1f77bcf86cd799439011",
        "name": "Brake Parts",
        "description": "All brake-related spare parts",
        "createdAt": "2025-01-12T10:05:00.000Z",
        "updatedAt": "2025-01-12T10:05:00.000Z"
      }
    ]
  }
}
```

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/business/item-groups/507f1f77bcf86cd799439011
```

---

#### 3. Update Item Group

**Endpoint:** `PUT /business/item-groups/:clientId/:groupId`

**Purpose:** Update item group details.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description           |
| ---------- | ------ | -------- | --------------------- |
| `clientId` | string | ✅       | Client's ObjectId     |
| `groupId`  | string | ✅       | Item group's ObjectId |

##### Request Body

```json
{
  "name": "Engine Parts - Updated",
  "description": "Updated description for engine parts"
}
```

##### Success Response (200)

```json
{
  "success": true,
  "message": "Item group updated",
  "data": {
    "itemGroup": {
      "_id": "507f1f77bcf86cd799439013",
      "clientId": "507f1f77bcf86cd799439011",
      "name": "Engine Parts - Updated",
      "description": "Updated description for engine parts",
      "updatedAt": "2025-01-12T11:00:00.000Z"
    }
  }
}
```

##### Error Response (404)

```json
{
  "success": false,
  "message": "Item group not found"
}
```

##### cURL Example

```bash
curl -X PUT https://viveha-backend.onrender.com/api/business/item-groups/507f1f77bcf86cd799439011/507f1f77bcf86cd799439013 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engine Parts - Updated",
    "description": "Updated description"
  }'
```

---

#### 4. Delete Item Group

**Endpoint:** `DELETE /business/item-groups/:clientId/:groupId`

**Purpose:** Delete an item group.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description           |
| ---------- | ------ | -------- | --------------------- |
| `clientId` | string | ✅       | Client's ObjectId     |
| `groupId`  | string | ✅       | Item group's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "message": "Item group deleted"
}
```

##### Error Response (404)

```json
{
  "success": false,
  "message": "Item group not found"
}
```

##### Important Notes

- Deleting a group does **NOT** delete associated items
- Items will have `groupId: null` after group deletion
- Reassign items to new groups before deletion if needed

##### cURL Example

```bash
curl -X DELETE https://viveha-backend.onrender.com/api/business/item-groups/507f1f77bcf86cd799439011/507f1f77bcf86cd799439013
```

---

### Items

Product catalog management with dealer/supplier linkage support.

---

#### 1. Create Item

**Endpoint:** `POST /business/items`

**Purpose:** Add a new product to inventory.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "name": "Carburetor",
  "price": 2500,
  "stock": 50,
  "lowStockQuantity": 10,
  "unit": "nos",
  "groupId": "507f1f77bcf86cd799439013",
  "dealerIds": ["507f1f77bcf86cd799439050", "507f1f77bcf86cd799439051"],
  "description": "2-barrel carburetor for vehicles"
}
```

##### Request Parameters

| Field              | Type     | Required | Description                 | Constraints                          |
| ------------------ | -------- | -------- | --------------------------- | ------------------------------------ |
| `clientId`         | string   | ✅       | Client's ObjectId           | Valid ObjectId                       |
| `name`             | string   | ✅       | Item name                   | Min 2 chars                          |
| `price`            | number   | ✅       | Selling price               | >= 0                                 |
| `stock`            | number   | ❌       | Stock quantity              | >= 0, default: 0                     |
| `lowStockQuantity` | number   | ❌       | Low stock threshold         | >= 0, default: 5                     |
| `unit`             | string   | ❌       | Unit of measure             | `nos`, `kg`, `litre`, `meter`, `pcs` |
| `groupId`          | string   | ❌       | Item group ID               | Valid ObjectId or null               |
| `dealerIds`        | string[] | ❌       | Dealer/Supplier IDs (multi) | Array of valid ObjectIds             |
| `description`      | string   | ❌       | Item description            | Max 500 chars                        |

> **Note:** Items can be sourced from multiple dealers. The `dealerIds` field accepts an array of dealer ObjectIds. This allows the same item to be ordered from different suppliers.

##### Success Response (201)

```json
{
  "success": true,
  "item": {
    "_id": "507f1f77bcf86cd799439020",
    "productId": "507f1f77bcf86cd799439020",
    "clientId": "507f1f77bcf86cd799439011",
    "name": "Carburetor",
    "price": 2500,
    "stock": 50,
    "lowStockQuantity": 10,
    "unit": "nos",
    "groupId": "507f1f77bcf86cd799439013",
    "dealerIds": ["507f1f77bcf86cd799439050", "507f1f77bcf86cd799439051"],
    "description": "2-barrel carburetor for vehicles",
    "isActive": true,
    "createdAt": "2025-01-12T10:00:00.000Z",
    "updatedAt": "2025-01-12T10:00:00.000Z"
  }
}
```

##### Error Response (400)

```json
{
  "success": false,
  "message": "Item name and price are required"
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "name": "Carburetor",
    "price": 2500,
    "stock": 50,
    "lowStockQuantity": 10,
    "unit": "nos",
    "groupId": "507f1f77bcf86cd799439013",
    "dealerIds": ["507f1f77bcf86cd799439050"],
    "description": "2-barrel carburetor for vehicles"
  }'
```

---

#### 2. Get All Items

**Endpoint:** `GET /business/items/:clientId`

**Purpose:** Retrieve all items for a client.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Query Parameters

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| `groupId` | string | ❌       | Filter by item group |

##### Success Response (200)

```json
{
  "success": true,
  "items": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "productId": "507f1f77bcf86cd799439020",
      "clientId": "507f1f77bcf86cd799439011",
      "name": "Carburetor",
      "price": 2500,
      "stock": 50,
      "lowStockQuantity": 10,
      "unit": "nos",
      "groupId": "507f1f77bcf86cd799439013",
      "dealerIds": ["507f1f77bcf86cd799439050"],
      "description": "2-barrel carburetor for vehicles",
      "isActive": true,
      "createdAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439021",
      "productId": "507f1f77bcf86cd799439021",
      "clientId": "507f1f77bcf86cd799439011",
      "name": "Brake Pad Set",
      "price": 1200,
      "stock": 30,
      "lowStockQuantity": 5,
      "unit": "nos",
      "groupId": "507f1f77bcf86cd799439014",
      "dealerIds": ["507f1f77bcf86cd799439050", "507f1f77bcf86cd799439051"],
      "description": "High-quality brake pads for sedans",
      "isActive": true,
      "createdAt": "2025-01-12T10:05:00.000Z"
    }
  ]
}
```

##### cURL Examples

```bash
# Get all items
curl -X GET https://viveha-backend.onrender.com/api/business/items/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"

# Filter by group
curl -X GET "https://viveha-backend.onrender.com/api/business/items/507f1f77bcf86cd799439011?groupId=507f1f77bcf86cd799439013" \
  -H "Authorization: Bearer <token>"
```

---

#### 3. Update Item

**Endpoint:** `PUT /business/items/:clientId/:itemId`

**Purpose:** Update item details.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |
| `itemId`   | string | ✅       | Item's ObjectId   |

##### Request Body

```json
{
  "name": "Carburetor - Premium",
  "price": 3000,
  "stock": 75,
  "lowStockQuantity": 15,
  "unit": "nos",
  "dealerIds": ["507f1f77bcf86cd799439050", "507f1f77bcf86cd799439051"],
  "description": "Premium 2-barrel carburetor"
}
```

##### Success Response (200)

```json
{
  "success": true,
  "item": {
    "_id": "507f1f77bcf86cd799439020",
    "name": "Carburetor - Premium",
    "price": 3000,
    "stock": 75,
    "lowStockQuantity": 15,
    "dealerIds": ["507f1f77bcf86cd799439050", "507f1f77bcf86cd799439051"],
    "updatedAt": "2025-01-12T11:00:00.000Z"
  }
}
```

##### cURL Example

```bash
curl -X PUT https://viveha-backend.onrender.com/api/business/items/507f1f77bcf86cd799439011/507f1f77bcf86cd799439020 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "price": 3000,
    "stock": 75,
    "dealerIds": ["507f1f77bcf86cd799439050"]
  }'
```

---

#### 4. Delete Item (Soft Delete)

**Endpoint:** `DELETE /business/items/:clientId/:itemId`

**Purpose:** Deactivate item (soft delete).

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |
| `itemId`   | string | ✅       | Item's ObjectId   |

##### Success Response (200)

```json
{
  "success": true,
  "message": "Item deleted"
}
```

##### Important Notes

- Item is marked as `isActive: false` (soft delete)
- Item data preserved for historical accuracy
- Can be reactivated via update endpoint

##### cURL Example

```bash
curl -X DELETE https://viveha-backend.onrender.com/api/business/items/507f1f77bcf86cd799439011/507f1f77bcf86cd799439020 \
  -H "Authorization: Bearer <token>"
```

---

### Dealers

Dealer/supplier management for inventory sourcing and purchase tracking.

---

#### 1. Create Dealer

**Endpoint:** `POST /dealers`

**Purpose:** Register a new dealer/supplier.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "name": "ABC Auto Parts Supplier",
  "contactPerson": "John Smith",
  "phoneNumber": "9876543210",
  "email": "supplier@abcauto.com",
  "address": "123 Industrial Area, Bangalore",
  "logoUrl": "https://example.com/dealer-logo.png"
}
```

##### Request Parameters

| Field           | Type   | Required | Description         | Constraints    |
| --------------- | ------ | -------- | ------------------- | -------------- |
| `clientId`      | string | ✅       | Client's ObjectId   | Valid ObjectId |
| `name`          | string | ✅       | Dealer name         | Min 2 chars    |
| `contactPerson` | string | ❌       | Contact person name | -              |
| `phoneNumber`   | string | ❌       | Dealer phone        | -              |
| `email`         | string | ❌       | Dealer email        | Valid email    |
| `address`       | string | ❌       | Dealer address      | -              |
| `logoUrl`       | string | ❌       | Dealer logo URL     | Valid URL      |

##### Success Response (201)

```json
{
  "success": true,
  "dealer": {
    "_id": "507f1f77bcf86cd799439050",
    "clientId": "507f1f77bcf86cd799439011",
    "name": "ABC Auto Parts Supplier",
    "contactPerson": "John Smith",
    "phoneNumber": "9876543210",
    "email": "supplier@abcauto.com",
    "address": "123 Industrial Area, Bangalore",
    "logoUrl": "https://example.com/dealer-logo.png",
    "isActive": true,
    "createdAt": "2025-01-12T10:00:00.000Z"
  }
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/dealers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "name": "ABC Auto Parts Supplier",
    "contactPerson": "John Smith",
    "phoneNumber": "9876543210"
  }'
```

---

#### 2. Get All Dealers

**Endpoint:** `GET /dealers/:clientId`

**Purpose:** Retrieve all active dealers for a client.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "dealers": [
    {
      "_id": "507f1f77bcf86cd799439050",
      "name": "ABC Auto Parts Supplier",
      "contactPerson": "John Smith",
      "phoneNumber": "9876543210",
      "email": "supplier@abcauto.com",
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439051",
      "name": "XYZ Motors Dealer",
      "contactPerson": "Jane Doe",
      "phoneNumber": "9876543211",
      "email": "jane@xyzmotors.com",
      "isActive": true
    }
  ]
}
```

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

---

#### 3. Update Dealer

**Endpoint:** `PUT /dealers/:clientId/:dealerId`

**Purpose:** Update dealer information.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |
| `dealerId` | string | ✅       | Dealer's ObjectId |

##### Request Body

```json
{
  "name": "ABC Auto Parts - Premium",
  "contactPerson": "Jane Smith",
  "phoneNumber": "9876543211"
}
```

##### Success Response (200)

```json
{
  "success": true,
  "dealer": {
    "_id": "507f1f77bcf86cd799439050",
    "name": "ABC Auto Parts - Premium",
    "contactPerson": "Jane Smith",
    "phoneNumber": "9876543211",
    "updatedAt": "2025-01-12T11:00:00.000Z"
  }
}
```

##### cURL Example

```bash
curl -X PUT https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"contactPerson": "Jane Smith"}'
```

---

#### 4. Delete Dealer (Soft Delete)

**Endpoint:** `DELETE /dealers/:clientId/:dealerId`

**Purpose:** Deactivate dealer (soft delete).

**Authentication:** Bearer Token (JWT required)

##### Success Response (200)

```json
{
  "success": true,
  "message": "Dealer deactivated"
}
```

##### cURL Example

```bash
curl -X DELETE https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050 \
  -H "Authorization: Bearer <token>"
```

---

#### 5. Get Dealer Items

**Endpoint:** `GET /dealers/:clientId/:dealerId/items`

**Purpose:** Get all items associated with a specific dealer.

**Authentication:** Bearer Token (JWT required)

##### Success Response (200)

```json
{
  "success": true,
  "items": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "name": "Carburetor",
      "price": 2500,
      "stock": 50,
      "lowStockQuantity": 10,
      "dealerIds": ["507f1f77bcf86cd799439050"]
    },
    {
      "_id": "507f1f77bcf86cd799439021",
      "name": "Brake Pad Set",
      "price": 1200,
      "stock": 30,
      "lowStockQuantity": 5,
      "dealerIds": ["507f1f77bcf86cd799439050", "507f1f77bcf86cd799439051"]
    }
  ]
}
```

> **Note:** Items are now linked via `dealerIds` (array), allowing items to be sourced from multiple dealers.

````

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050/items \
  -H "Authorization: Bearer <token>"
````

---

#### 6. Get Dealer Low Stock Items

**Endpoint:** `GET /dealers/:clientId/:dealerId/items/low-stock`

**Purpose:** Get items from dealer with low stock (stock <= item's lowStockQuantity threshold).

**Authentication:** Bearer Token (JWT required)

##### Success Response (200)

```json
{
  "success": true,
  "items": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "name": "Carburetor",
      "price": 2500,
      "stock": 3,
      "lowStockQuantity": 10,
      "dealerIds": ["507f1f77bcf86cd799439050"]
    },
    {
      "_id": "507f1f77bcf86cd799439022",
      "name": "Air Filter",
      "price": 450,
      "stock": 2,
      "lowStockQuantity": 5,
      "dealerIds": ["507f1f77bcf86cd799439050"]
    }
  ]
}
```

> **Note:** Low stock threshold is now per-item via `lowStockQuantity` field (default: 5).

````

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050/items/low-stock \
  -H "Authorization: Bearer <token>"
````

---

#### 7. Get Dealer Order Recommendations

**Endpoint:** `GET /dealers/:clientId/:dealerId/orders/recommendations`

**Purpose:** Get low stock items with suggested reorder quantities.

**Authentication:** Bearer Token (JWT required)

##### Success Response (200)

```json
{
  "success": true,
  "recommendations": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "name": "Carburetor",
      "stock": 3,
      "suggestedQty": 7
    },
    {
      "_id": "507f1f77bcf86cd799439022",
      "name": "Air Filter",
      "stock": 2,
      "suggestedQty": 8
    }
  ]
}
```

##### Notes

- Returns items with stock <= 5
- `suggestedQty` calculated to reach target stock of 10 units

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050/orders/recommendations \
  -H "Authorization: Bearer <token>"
```

---

#### 8. Create Dealer Order

**Endpoint:** `POST /dealers/orders`

**Purpose:** Create a purchase order to dealer for stock replenishment. Items are ordered by quantity only - the total bill amount is entered when the order is marked as delivered.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "dealerId": "507f1f77bcf86cd799439050",
  "items": [
    {
      "itemId": "507f1f77bcf86cd799439020",
      "quantity": 10
    }
  ],
  "notes": "Regular stock replenishment",
  "deliveryInstructions": "Deliver to warehouse entrance",
  "isUrgent": false
}
```

##### Request Parameters

| Field                  | Type    | Required | Description            | Constraints                   |
| ---------------------- | ------- | -------- | ---------------------- | ----------------------------- |
| `clientId`             | string  | ✅       | Client's ObjectId      | Valid ObjectId                |
| `dealerId`             | string  | ✅       | Dealer's ObjectId      | Valid ObjectId                |
| `items`                | array   | ✅       | Items to order         | Non-empty                     |
| `items[].itemId`       | string  | ✅       | Item's ObjectId        | Must be in dealer's dealerIds |
| `items[].quantity`     | number  | ✅       | Quantity to order      | > 0                           |
| `notes`                | string  | ❌       | Order notes            | -                             |
| `deliveryInstructions` | string  | ❌       | Delivery instructions  | -                             |
| `isUrgent`             | boolean | ❌       | Mark as urgent         | default: false                |
| `pdfUrl`               | string  | ❌       | PDF order document URL | -                             |
| `orderNumber`          | string  | ❌       | Custom order number    | Auto-generated                |

> **Note:** Items must belong to the specified dealer (dealer's ID must be in item's `dealerIds` array). No pricing information is stored at order creation - the actual bill total is entered when marking the order as delivered.

##### Success Response (201)

```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439060",
    "orderNumber": "DORD-1704967200000",
    "clientId": "507f1f77bcf86cd799439011",
    "dealerId": "507f1f77bcf86cd799439050",
    "status": "pending",
    "isUrgent": false,
    "totalAmount": null,
    "dueDate": null,
    "createdAt": "2025-01-12T10:00:00.000Z"
  }
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/dealers/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "dealerId": "507f1f77bcf86cd799439050",
    "items": [{"itemId": "507f1f77bcf86cd799439020", "quantity": 10}]
  }'
```

---

#### 9. Get Dealer Orders

**Endpoint:** `GET /dealers/:clientId/:dealerId/orders`

**Purpose:** Get all orders for a specific dealer.

**Authentication:** Bearer Token (JWT required)

##### Success Response (200)

```json
{
  "success": true,
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439060",
      "orderNumber": "DORD-1704967200000",
      "status": "pending",
      "totalAmount": null,
      "dueDate": null,
      "isUrgent": false,
      "createdAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439061",
      "orderNumber": "DORD-1704880800000",
      "status": "delivered",
      "totalAmount": 15000,
      "dueDate": "2025-02-11T10:00:00.000Z",
      "isUrgent": true,
      "createdAt": "2025-01-11T10:00:00.000Z"
    }
  ]
}
```

> **Note:** `totalAmount` is null for pending orders and populated when marked delivered. `dueDate` is the payment due date set at delivery time.

````

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050/orders \
  -H "Authorization: Bearer <token>"
````

---

#### 10. Get Dealer Order By ID

**Endpoint:** `GET /dealers/orders/:orderId?clientId=<clientId>`

**Purpose:** Get specific dealer order with order items.

**Authentication:** Bearer Token (JWT required)

##### Query Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439060",
    "orderNumber": "DORD-1704967200000",
    "status": "pending",
    "totalAmount": null,
    "dueDate": null
  },
  "items": [
    {
      "itemId": "507f1f77bcf86cd799439020",
      "itemNameSnapshot": "Carburetor",
      "quantity": 10
    }
  ]
}
```

> **Note:** Order items only store `itemNameSnapshot` and `quantity`. No per-item pricing is tracked - the total bill amount is entered manually when the order is marked delivered.

````

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/dealers/orders/507f1f77bcf86cd799439060?clientId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"
````

---

#### 11. Cancel Dealer Order

**Endpoint:** `POST /dealers/orders/:orderId/cancel`

**Purpose:** Cancel a pending dealer order.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011"
}
```

##### Success Response (200)

```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439060",
    "status": "cancelled",
    "cancelledAt": "2025-01-12T11:00:00.000Z"
  }
}
```

##### Error Response (400)

```json
{
  "success": false,
  "message": "Only pending orders can be cancelled"
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/dealers/orders/507f1f77bcf86cd799439060/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"clientId": "507f1f77bcf86cd799439011"}'
```

---

#### 12. Mark Dealer Order Delivered

**Endpoint:** `POST /dealers/orders/:orderId/mark-delivered`

**Purpose:** Mark a pending order as delivered. **Automatically increments stock** for all ordered items. This is when the actual bill total and payment due date are recorded.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "totalAmount": 25000,
  "dueDate": "2025-02-12T00:00:00.000Z",
  "deliveredBy": "Warehouse Staff",
  "deliveryNote": "All items received in good condition"
}
```

##### Request Parameters

| Field          | Type   | Required | Description                   |
| -------------- | ------ | -------- | ----------------------------- |
| `clientId`     | string | ✅       | Client's ObjectId             |
| `totalAmount`  | number | ❌       | Total bill amount from dealer |
| `dueDate`      | string | ❌       | Payment due date (ISO format) |
| `deliveredBy`  | string | ❌       | Who received the delivery     |
| `deliveryNote` | string | ❌       | Delivery notes                |

> **Note:** The `totalAmount` is the actual bill total from the dealer's invoice. This amount is used for payment tracking and dealer balance calculations. The `dueDate` helps track payment deadlines.

##### Success Response (200)

```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439060",
    "status": "delivered",
    "totalAmount": 25000,
    "dueDate": "2025-02-12T00:00:00.000Z",
    "deliveredAt": "2025-01-12T12:00:00.000Z",
    "deliveryAudit": {
      "deliveredBy": "Warehouse Staff",
      "deliveryNote": "All items received in good condition",
      "deliveredAt": "2025-01-12T12:00:00.000Z"
    }
  }
}
```

##### Important Notes

- **Stock Auto-Update**: All items in the order have their stock incremented automatically
- **Bill Entry**: Enter the `totalAmount` from dealer's physical bill/invoice
- **Payment Due Date**: Set `dueDate` to track payment deadlines
- Only pending orders can be marked as delivered
- Creates audit trail with delivery details

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/dealers/orders/507f1f77bcf86cd799439060/mark-delivered \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "totalAmount": 25000,
    "dueDate": "2025-02-12T00:00:00.000Z",
    "deliveredBy": "Warehouse Staff"
  }'
```

---

#### 13. Create Dealer Payment

**Endpoint:** `POST /dealers/payments`

**Purpose:** Record a payment to dealer. Optionally link to a specific order for payment tracking.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "dealerId": "507f1f77bcf86cd799439050",
  "orderId": "507f1f77bcf86cd799439060",
  "amount": 5000,
  "method": "bank",
  "note": "Payment for order DORD-1704967200000",
  "proofUrl": "https://example.com/payment-receipt.pdf"
}
```

##### Request Parameters

| Field      | Type   | Required | Description              | Constraints                            |
| ---------- | ------ | -------- | ------------------------ | -------------------------------------- |
| `clientId` | string | ✅       | Client's ObjectId        | Valid ObjectId                         |
| `dealerId` | string | ✅       | Dealer's ObjectId        | Valid ObjectId                         |
| `orderId`  | string | ❌       | Order to link payment to | Valid ObjectId (for payment tracking)  |
| `amount`   | number | ✅       | Payment amount           | > 0                                    |
| `method`   | string | ❌       | Payment method           | `cash`, `card`, `upi`, `bank`, `other` |
| `note`     | string | ❌       | Payment note             | -                                      |
| `proofUrl` | string | ❌       | Receipt URL              | Valid URL                              |
| `paidAt`   | date   | ❌       | Payment date             | ISO date string                        |

> **Note:** When `orderId` is provided, the payment is linked to that specific order. This enables tracking payment status per order (pending, partial, paid).

##### Success Response (201)

```json
{
  "success": true,
  "payment": {
    "_id": "507f1f77bcf86cd799439070",
    "clientId": "507f1f77bcf86cd799439011",
    "dealerId": "507f1f77bcf86cd799439050",
    "orderId": "507f1f77bcf86cd799439060",
    "amount": 5000,
    "method": "bank",
    "note": "Payment for order DORD-1704967200000",
    "proofUrl": "https://example.com/payment-receipt.pdf",
    "paidAt": "2025-01-12T12:00:00.000Z"
  }
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/dealers/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "dealerId": "507f1f77bcf86cd799439050",
    "orderId": "507f1f77bcf86cd799439060",
    "amount": 5000,
    "method": "bank",
    "note": "Payment for order DORD-1704967200000",
    "proofUrl": "https://example.com/payment-receipt.pdf"
  }'
```

---

#### 14. Get Dealer Payments

**Endpoint:** `GET /dealers/:clientId/:dealerId/payments`

**Purpose:** Get all payments made to a specific dealer.

**Authentication:** Bearer Token (JWT required)

##### Success Response (200)

```json
{
  "success": true,
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439070",
      "amount": 5000,
      "method": "bank",
      "note": "Payment for order DORD-1704967200000",
      "proofUrl": "https://example.com/receipt1.pdf",
      "paidAt": "2025-01-12T12:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439071",
      "amount": 10000,
      "method": "upi",
      "note": "Payment for order DORD-1704880800000",
      "proofUrl": "https://example.com/receipt2.png",
      "paidAt": "2025-01-11T14:00:00.000Z"
    }
  ]
}
```

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050/payments \
  -H "Authorization: Bearer <token>"
```

---

#### 15. Get Dealer Summary

**Endpoint:** `GET /dealers/:clientId/:dealerId/summary`

**Purpose:** Get dealer financial summary with payable balance and timeline.

**Authentication:** Bearer Token (JWT required)

##### Success Response (200)

```json
{
  "success": true,
  "totalOrdered": 50000,
  "totalPaid": 35000,
  "payable": 15000,
  "timeline": [
    {
      "type": "order",
      "at": "2025-01-12T10:00:00.000Z",
      "data": {
        "orderNumber": "DORD-1704967200000",
        "totalPurchase": 20000,
        "status": "delivered"
      }
    },
    {
      "type": "payment",
      "at": "2025-01-12T12:00:00.000Z",
      "data": {
        "amount": 5000,
        "method": "bank"
      }
    }
  ]
}
```

##### Response Fields

| Field          | Type   | Description                                |
| -------------- | ------ | ------------------------------------------ |
| `totalOrdered` | number | Total value of all non-cancelled orders    |
| `totalPaid`    | number | Total payments made to dealer              |
| `payable`      | number | Outstanding balance (ordered - paid)       |
| `timeline`     | array  | Recent orders and payments (chronological) |

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050/summary \
  -H "Authorization: Bearer <token>"
```

---

#### 16. Get Dealer Transactions (Specific Dealer)

**Endpoint:** `GET /dealers/:clientId/:dealerId/transactions`

**Purpose:** Get all transactions (orders and payments) for a specific dealer as a unified timeline.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |
| `dealerId` | string | ✅       | Dealer's ObjectId |

##### Query Parameters

| Parameter | Type   | Required | Description                    | Default |
| --------- | ------ | -------- | ------------------------------ | ------- |
| `limit`   | number | ❌       | Maximum number of transactions | 50      |
| `skip`    | number | ❌       | Number of transactions to skip | 0       |

##### Success Response (200)

```json
{
  "success": true,
  "dealer": {
    "_id": "507f1f77bcf86cd799439050",
    "name": "ABC Auto Parts Supplier",
    "contactPerson": "John Smith",
    "phoneNumber": "9876543210"
  },
  "totalCount": 10,
  "transactions": [
    {
      "type": "order",
      "transactionId": "507f1f77bcf86cd799439060",
      "dealerId": "507f1f77bcf86cd799439050",
      "dealerName": "ABC Auto Parts Supplier",
      "orderNumber": "DORD-1704967200000",
      "amount": 20000,
      "status": "delivered",
      "date": "2025-01-12T10:00:00.000Z",
      "details": {
        "isUrgent": false,
        "deliveredAt": "2025-01-12T14:00:00.000Z",
        "cancelledAt": null,
        "notes": "Regular stock replenishment"
      }
    },
    {
      "type": "payment",
      "transactionId": "507f1f77bcf86cd799439070",
      "dealerId": "507f1f77bcf86cd799439050",
      "dealerName": "ABC Auto Parts Supplier",
      "amount": 5000,
      "method": "bank",
      "date": "2025-01-12T12:00:00.000Z",
      "details": {
        "note": "Payment for order DORD-1704967200000",
        "proofUrl": "https://example.com/payment-receipt.pdf"
      }
    }
  ]
}
```

##### Response Fields

| Field          | Type   | Description                                          |
| -------------- | ------ | ---------------------------------------------------- |
| `dealer`       | object | Dealer basic information                             |
| `totalCount`   | number | Total number of transactions (before pagination)     |
| `transactions` | array  | Array of transactions (orders and payments combined) |

##### Transaction Object Fields

| Field           | Type   | Description                                                         |
| --------------- | ------ | ------------------------------------------------------------------- |
| `type`          | string | Transaction type: `order` or `payment`                              |
| `transactionId` | string | ObjectId of the order or payment                                    |
| `dealerId`      | string | Dealer's ObjectId                                                   |
| `dealerName`    | string | Dealer's name                                                       |
| `orderNumber`   | string | Order number (only for orders)                                      |
| `amount`        | number | Transaction amount                                                  |
| `status`        | string | Order status (only for orders): `pending`, `delivered`, `cancelled` |
| `method`        | string | Payment method (only for payments)                                  |
| `date`          | date   | Transaction date                                                    |
| `details`       | object | Additional transaction details                                      |

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/507f1f77bcf86cd799439050/transactions?limit=20&skip=0" \
  -H "Authorization: Bearer <token>"
```

---

#### 17. Get All Dealer Transactions

**Endpoint:** `GET /dealers/:clientId/transactions`

**Purpose:** Get all transactions (orders and payments) across all dealers for a client.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Query Parameters

| Parameter | Type   | Required | Description                    | Default |
| --------- | ------ | -------- | ------------------------------ | ------- |
| `limit`   | number | ❌       | Maximum number of transactions | 50      |
| `skip`    | number | ❌       | Number of transactions to skip | 0       |

##### Success Response (200)

```json
{
  "success": true,
  "summary": {
    "totalDealers": 3,
    "totalOrders": 85000,
    "totalPayments": 60000,
    "pendingPayable": 25000
  },
  "totalCount": 25,
  "transactions": [
    {
      "type": "order",
      "transactionId": "507f1f77bcf86cd799439060",
      "dealerId": "507f1f77bcf86cd799439050",
      "dealerName": "ABC Auto Parts Supplier",
      "orderNumber": "DORD-1704967200000",
      "amount": 20000,
      "status": "delivered",
      "date": "2025-01-12T10:00:00.000Z",
      "details": {
        "isUrgent": false,
        "deliveredAt": "2025-01-12T14:00:00.000Z",
        "cancelledAt": null,
        "notes": "Regular stock replenishment"
      }
    },
    {
      "type": "payment",
      "transactionId": "507f1f77bcf86cd799439070",
      "dealerId": "507f1f77bcf86cd799439050",
      "dealerName": "ABC Auto Parts Supplier",
      "amount": 5000,
      "method": "bank",
      "date": "2025-01-12T12:00:00.000Z",
      "details": {
        "note": "Payment for order DORD-1704967200000",
        "proofUrl": "https://example.com/payment-receipt.pdf"
      }
    }
  ]
}
```

##### Response Fields

| Field          | Type   | Description                                          |
| -------------- | ------ | ---------------------------------------------------- |
| `summary`      | object | Aggregated summary across all dealers                |
| `totalCount`   | number | Total number of transactions (before pagination)     |
| `transactions` | array  | Array of transactions (orders and payments combined) |

##### Summary Object Fields

| Field            | Type   | Description                            |
| ---------------- | ------ | -------------------------------------- |
| `totalDealers`   | number | Number of active dealers               |
| `totalOrders`    | number | Total value of all orders              |
| `totalPayments`  | number | Total value of all payments            |
| `pendingPayable` | number | Outstanding balance across all dealers |

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/transactions?limit=20&skip=0" \
  -H "Authorization: Bearer <token>"
```

---

#### 18. Get Order Payment Status

**Endpoint:** `GET /dealers/:clientId/order-payments`

**Purpose:** Query orders by their payment status. Essential for tracking which orders are pending payment, partially paid, or fully paid.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Query Parameters

| Parameter  | Type   | Required | Description               | Default |
| ---------- | ------ | -------- | ------------------------- | ------- |
| `status`   | string | ❌       | Payment status filter     | `all`   |
| `dealerId` | string | ❌       | Filter by specific dealer | -       |
| `limit`    | number | ❌       | Maximum number of orders  | 50      |
| `skip`     | number | ❌       | Number of orders to skip  | 0       |

##### Status Values

| Status    | Description                                                     |
| --------- | --------------------------------------------------------------- |
| `all`     | All orders (default)                                            |
| `pending` | Orders with bill entered but no payments made                   |
| `partial` | Orders with some payment but not fully paid                     |
| `paid`    | Orders fully paid (remaining = 0)                               |
| `no-bill` | Orders delivered but bill not yet entered (totalAmount is null) |

##### Success Response (200)

```json
{
  "success": true,
  "summary": {
    "totalOrders": 15,
    "pendingOrders": 3,
    "partialOrders": 5,
    "paidOrders": 6,
    "noBillOrders": 1,
    "totalAmount": 150000,
    "totalPaid": 95000,
    "totalRemaining": 55000
  },
  "totalCount": 5,
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439060",
      "orderNumber": "DORD-1704967200000",
      "dealerId": "507f1f77bcf86cd799439050",
      "dealerName": "ABC Auto Parts Supplier",
      "status": "delivered",
      "totalAmount": 25000,
      "dueDate": "2025-02-12T00:00:00.000Z",
      "createdAt": "2025-01-12T10:00:00.000Z",
      "deliveredAt": "2025-01-12T14:00:00.000Z",
      "paymentStatus": "partial",
      "totalPaid": 10000,
      "remaining": 15000,
      "paymentCount": 2
    },
    {
      "_id": "507f1f77bcf86cd799439061",
      "orderNumber": "DORD-1704880800000",
      "dealerId": "507f1f77bcf86cd799439050",
      "dealerName": "ABC Auto Parts Supplier",
      "status": "delivered",
      "totalAmount": 15000,
      "dueDate": "2025-02-01T00:00:00.000Z",
      "createdAt": "2025-01-11T10:00:00.000Z",
      "deliveredAt": "2025-01-11T12:00:00.000Z",
      "paymentStatus": "paid",
      "totalPaid": 15000,
      "remaining": 0,
      "paymentCount": 1
    }
  ]
}
```

##### Response Fields

**Summary Object:**

| Field            | Type   | Description                                   |
| ---------------- | ------ | --------------------------------------------- |
| `totalOrders`    | number | Total count of all non-cancelled orders       |
| `pendingOrders`  | number | Orders with bill but no payments              |
| `partialOrders`  | number | Orders with partial payments                  |
| `paidOrders`     | number | Fully paid orders                             |
| `noBillOrders`   | number | Orders without totalAmount (bill not entered) |
| `totalAmount`    | number | Sum of all order totalAmounts                 |
| `totalPaid`      | number | Sum of all payments linked to orders          |
| `totalRemaining` | number | Outstanding balance across all orders         |

**Order Object:**

| Field           | Type   | Description                                       |
| --------------- | ------ | ------------------------------------------------- |
| `_id`           | string | Order ObjectId                                    |
| `orderNumber`   | string | Order reference number                            |
| `dealerId`      | string | Dealer's ObjectId                                 |
| `dealerName`    | string | Dealer's name                                     |
| `status`        | string | Order status: `pending`, `delivered`, `cancelled` |
| `totalAmount`   | number | Bill total (null if not entered)                  |
| `dueDate`       | date   | Payment due date                                  |
| `paymentStatus` | string | `pending`, `partial`, `paid`, or `no-bill`        |
| `totalPaid`     | number | Sum of payments made for this order               |
| `remaining`     | number | Amount still owed (totalAmount - totalPaid)       |
| `paymentCount`  | number | Number of payments made                           |

##### cURL Examples

```bash
# Get all orders with payment status
curl -X GET "https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/order-payments" \
  -H "Authorization: Bearer <token>"

# Get only pending orders (no payments made)
curl -X GET "https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/order-payments?status=pending" \
  -H "Authorization: Bearer <token>"

# Get partially paid orders
curl -X GET "https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/order-payments?status=partial" \
  -H "Authorization: Bearer <token>"

# Get fully paid orders
curl -X GET "https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/order-payments?status=paid" \
  -H "Authorization: Bearer <token>"

# Get orders for a specific dealer
curl -X GET "https://viveha-backend.onrender.com/api/dealers/507f1f77bcf86cd799439011/order-payments?dealerId=507f1f77bcf86cd799439050&status=partial" \
  -H "Authorization: Bearer <token>"
```

---

### Client Customers

Client customer relationship management.

---

#### 1. Create/Update Client Customer

**Endpoint:** `POST /business/client-customers`

**Purpose:** Create a new client customer or update an existing one by phone.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "name": "Bob Smith",
  "phone": "9891112222",
  "address": "123 clientCustomer Lane, City",
  "emailId": "bob@example.com",
  "gstNo": "22ABCDE1234F1Z5"
}
```

##### Request Parameters

| Field      | Type   | Required | Description             | Constraints    |
| ---------- | ------ | -------- | ----------------------- | -------------- |
| `clientId` | string | ✅       | Client's ObjectId       | Valid ObjectId |
| `name`     | string | ✅       | Client customer name    | 2+ chars       |
| `phone`    | string | ✅       | Client customer phone   | 10+ digits     |
| `address`  | string | ❌       | Client customer address | Max 500 chars  |
| `emailId`  | string | ❌       | Client customer email   | Valid email    |
| `gstNo`    | string | ❌       | Client customer GST No  | GST format     |

##### Success Response (200 or 201)

```json
{
  "success": true,
  "clientCustomer": {
    "_id": "607f1f77bcf86cd799439030",
    "clientId": "507f1f77bcf86cd799439011",
    "phoneNumber": "9891112222",
    "name": "Bob Smith",
    "address": "123 clientCustomer Lane, City",
    "emailId": "bob@example.com",
    "gstNo": "22ABCDE1234F1Z5",
    "firstSeenAt": "2025-01-12T10:00:00.000Z",
    "lastPurchaseAt": "2025-01-12T10:05:00.000Z"
  },
  "isNew": true // true if created, false if existing
}
```

##### Business Logic

1. **Uniqueness Check**: Client customer identified by `clientId + phoneNumber`
2. **Update or Create**:
   - If exists: updates `name`, `address`, `emailId`, `gstNo` (if provided)
   - If new: creates new client customer record
3. **Required Fields**: `clientId`, `name`, and `phone` are **always required**
4. **Optional Fields** (`address`, `emailId`, `gstNo`):
   - Can be sent regardless of `clientSettings.customerFields` values
   - Will be persisted to the database if provided
   - `clientSettings.customerFields` controls UI/frontend behavior, not API validation
5. **Field Persistence**: All provided fields are stored, even if corresponding `clientSettings.customerFields` flag is `false`

**Example Flow:**

```
Client Settings: { address: false, gstNo: true, emailId: false }

Request with address: "123 Street" → ✅ Saved (API accepts all fields)
Frontend should: Hide address input if setting is false
Backend behavior: Saves all provided fields regardless of settings
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/client-customers \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "name": "Bob Smith",
    "phone": "9891112222",
    "address": "123 clientCustomer Lane, City"
  }'
```

---

#### 2. Get All Client Customers

**Endpoint:** `GET /business/client-customers/:clientId`

**Purpose:** Retrieve all client customers for a client.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "clientCustomers": [
    {
      "_id": "607f1f77bcf86cd799439030",
      "phoneNumber": "9891112222",
      "name": "Bob Smith",
      "address": "123 clientCustomer Lane",
      "firstSeenAt": "2025-01-12T10:00:00.000Z",
      "lastPurchaseAt": "2025-01-12T10:05:00.000Z"
    },
    {
      "_id": "607f1f77bcf86cd799439031",
      "phoneNumber": "9891113333",
      "name": "Alice Brown",
      "address": "456 Customer Street",
      "firstSeenAt": "2025-01-11T09:00:00.000Z",
      "lastPurchaseAt": "2025-01-11T14:30:00.000Z"
    }
  ]
}
```

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/business/client-customers/507f1f77bcf86cd799439011
```

---

### Cart Management

Shopping cart for pre-invoice item selection.

---

#### 1. Create Cart

**Endpoint:** `POST /business/carts`

**Purpose:** Create a new shopping cart.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "clientCustomerPhone": "9891112222"
}
```

##### Request Parameters

| Field                 | Type   | Required | Description                        |
| --------------------- | ------ | -------- | ---------------------------------- |
| `clientId`            | string | ✅       | Client's ObjectId                  |
| `clientCustomerPhone` | string | ❌       | clientCustomer phone (for linking) |

##### Success Response (201)

```json
{
  "success": true,
  "cart": {
    "_id": "707f1f77bcf86cd799439040",
    "clientId": "507f1f77bcf86cd799439011",
    "clientCustomerPhone": "9891112222",
    "totalAmount": 0,
    "itemCount": 0,
    "isFinalized": false,
    "createdAt": "2025-01-12T10:00:00.000Z",
    "expiresAt": "2025-01-13T10:00:00.000Z"
  }
}
```

##### Important Notes

- Cart auto-expires in 24 hours (TTL index)
- Multiple carts can exist simultaneously
- Empty cart on creation

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/carts \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "clientCustomerPhone": "9891112222"
  }'
```

---

#### 2. Add Item to Cart

**Endpoint:** `POST /business/carts/add-item`

**Purpose:** Add product to shopping cart.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "cartId": "707f1f77bcf86cd799439040",
  "itemId": "507f1f77bcf86cd799439020",
  "itemName": "Carburetor",
  "unitPrice": 2500,
  "quantity": 2
}
```

##### Request Parameters

| Field       | Type   | Required | Description          | Constraints    |
| ----------- | ------ | -------- | -------------------- | -------------- |
| `cartId`    | string | ✅       | Cart's ObjectId      | Valid ObjectId |
| `itemId`    | string | ✅       | Item's ObjectId      | Valid ObjectId |
| `itemName`  | string | ✅       | Item name (snapshot) | String         |
| `unitPrice` | number | ✅       | Price per unit       | >= 0           |
| `quantity`  | number | ✅       | Quantity             | > 0            |

##### Success Response (200)

```json
{
  "success": true,
  "cartItem": {
    "_id": "807f1f77bcf86cd799439050",
    "cartId": "707f1f77bcf86cd799439040",
    "itemId": "507f1f77bcf86cd799439020",
    "itemNameSnapshot": "Carburetor",
    "unitPriceSnapshot": 2500,
    "quantity": 2,
    "lineTotal": 5000,
    "createdAt": "2025-01-12T10:00:00.000Z"
  }
}
```

##### Business Logic

1. Create CartItem with snapshots
2. Calculate lineTotal = quantity × unitPrice
3. Update Cart.totalAmount
4. Update Cart.itemCount

##### Why Snapshots?

- Preserves historical accuracy
- Price changes don't affect existing carts
- Item name changes don't affect existing carts

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/carts/add-item \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "707f1f77bcf86cd799439040",
    "itemId": "507f1f77bcf86cd799439020",
    "itemName": "Carburetor",
    "unitPrice": 2500,
    "quantity": 2
  }'
```

---

#### 3. Get Cart with Items

**Endpoint:** `GET /business/carts/:cartId`

**Purpose:** Retrieve cart details with all items.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `cartId`  | string | ✅       | Cart's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "707f1f77bcf86cd799439040",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerPhone": "9891112222",
      "totalAmount": 5000,
      "itemCount": 1,
      "isFinalized": false,
      "createdAt": "2025-01-12T10:00:00.000Z"
    },
    "cartItems": [
      {
        "_id": "807f1f77bcf86cd799439050",
        "itemNameSnapshot": "Carburetor",
        "unitPriceSnapshot": 2500,
        "quantity": 2,
        "lineTotal": 5000
      }
    ]
  }
}
```

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/business/carts/707f1f77bcf86cd799439040
```

---

#### 4. Remove Item from Cart

**Endpoint:** `POST /business/carts/remove-item`

**Purpose:** Remove specific item from cart.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "cartId": "707f1f77bcf86cd799439040",
  "cartItemId": "807f1f77bcf86cd799439050"
}
```

##### Success Response (200)

```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/carts/remove-item \
  -H "Content-Type: application/json" \
  -d '{
    "cartId": "707f1f77bcf86cd799439040",
    "cartItemId": "807f1f77bcf86cd799439050"
  }'
```

---

#### 5. Clear Cart

**Endpoint:** `POST /business/carts/clear`

**Purpose:** Remove all items from cart.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "cartId": "707f1f77bcf86cd799439040"
}
```

##### Success Response (200)

```json
{
  "success": true,
  "message": "Cart cleared"
}
```

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/carts/clear \
  -H "Content-Type: application/json" \
  -d '{"cartId": "707f1f77bcf86cd799439040"}'
```

---

### Invoices & Payments

Billing and payment processing.

**📝 Note:** Viveka uses a **unified invoice generation approach**. The `POST /business/invoices/generate` endpoint handles all payment scenarios:

- **Full Payment:** Set `paidAmount = totalAmount` → Invoice is immediately finalized
- **Partial Payment:** Set `paidAmount < totalAmount` → Invoice remains pending
- **No Payment:** Set `paidAmount = 0` or omit → Invoice created as unpaid
- **Later Payments:** Use `POST /business/invoices/pay` to add payments to existing invoices

This eliminates the need for separate endpoints for different payment statuses.

---

#### 1. Generate Invoice

**Endpoint:** `POST /business/invoices/generate`

**Purpose:** Create invoice immediately (with optional payment).

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "cartId": "707f1f77bcf86cd799439040",
  "clientCustomerId": "607f1f77bcf86cd799439030",
  "clientCustomerPhone": "9891112222",
  "clientCustomerName": "clientCustomer Name",
  "totalAmount": 5000,
  "paidAmount": 2000,
  "notes": "Partial payment received in cash"
}
```

##### Request Parameters

| Field                 | Type   | Required | Description                 | Constraints                             |
| --------------------- | ------ | -------- | --------------------------- | --------------------------------------- |
| `clientId`            | string | ✅       | Client's ObjectId           | Valid ObjectId                          |
| `cartId`              | string | ✅       | Cart's ObjectId             | Valid ObjectId                          |
| `clientCustomerId`    | string | ❌       | clientCustomer's ObjectId   | Valid ObjectId                          |
| `clientCustomerPhone` | string | ❌       | Client clientCustomer phone | For auto-creating client clientCustomer |
| `clientCustomerName`  | string | ❌       | Client clientCustomer name  | For auto-creating client clientCustomer |
| `totalAmount`         | number | ❌       | Invoice total               | Defaults to cart total                  |
| `paidAmount`          | number | ❌       | Amount paid                 | 0 to totalAmount, default: 0            |
| `notes`               | string | ❌       | Invoice notes               | Max 500 chars                           |

##### Success Response (201)

```json
{
  "success": true,
  "invoice": {
    "_id": "907f1f77bcf86cd799439060",
    "invoiceNumber": "INV-1704967200000",
    "clientId": "507f1f77bcf86cd799439011",
    "clientCustomerId": "607f1f77bcf86cd799439030",
    "clientCustomerName": "Bob Smith",
    "clientCustomerPhone": "9891112222",
    "subtotal": 5000,
    "totalTax": 0,
    "totalDiscount": 0,
    "totalAmount": 5000,
    "paidAmount": 2000,
    "isFinalized": false,
    "notes": "Partial payment received in cash",
    "products": [
      {
        "productId": "507f1f77bcf86cd799439099",
        "itemName": "Carburetor",
        "itemGroup": "Engine Parts",
        "quantity": 2,
        "costPerUnit": 2500
      }
    ],
    "generatedAt": "2025-01-12T10:00:00.000Z",
    "createdAt": "2025-01-12T10:00:00.000Z",
    "updatedAt": "2025-01-12T10:00:00.000Z"
  }
}
```

##### Error Responses

**400 - Empty Cart**

```json
{
  "success": false,
  "message": "Cart is empty"
}
```

**400 - Invalid Payment**

```json
{
  "success": false,
  "message": "Paid amount cannot exceed total amount"
}
```

##### Flow Diagram

```mermaid
sequenceDiagram
    participant App
    participant API
    participant BizSvc
    participant DB

    App->>API: POST /invoices/generate
    API->>BizSvc: Process invoice
    BizSvc->>DB: Get Cart & CartItems
    DB-->>BizSvc: Cart data
    alt Cart Not Empty
        BizSvc->>BizSvc: Resolve/create clientCustomer
        BizSvc->>BizSvc: Generate invoice number
        BizSvc->>DB: Create Invoice
        BizSvc->>DB: Update item stock (decrement)
        alt paidAmount > 0
            BizSvc->>DB: Create Payment record
        end
        alt paidAmount >= totalAmount
            BizSvc->>DB: Set isFinalized: true
            BizSvc->>DB: Create PurchaseHistory
        end
        BizSvc->>DB: Clear Cart
        BizSvc-->>API: Success
        API-->>App: {invoice}
    else Cart Empty
        BizSvc-->>API: Error
        API-->>App: {success: false}
    end
```

##### Business Logic

1. **Immediate Generation:** Invoice created regardless of payment status (paidAmount can be 0 or fully paid)
2. **clientCustomer Resolution:** Auto-creates clientCustomer from phone if not exists
3. **Stock Update:** Item stock decremented based on cart quantities
4. **Payment Recording:** If paidAmount > 0, payment record created
5. **Snapshot Products:** `products` stores item name, group, price, quantity at invoice time
6. **Finalization:** `isFinalized` is derived from paid vs total (`paidAmount >= totalAmount`)
7. **Purchase History:** If fully paid at creation and clientCustomer exists, one PurchaseHistory record is created
8. **Cart Cleanup:** Cart cleared after invoice generation
9. **Immutability:** Invoice totals/items cannot be changed after creation

##### Constraints

- Cart must have at least one item
- paidAmount cannot exceed totalAmount
- paidAmount cannot be negative
- Invoice number auto-generated (timestamp-based)
- Cart items copied to invoice products (snapshots preserved)

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/invoices/generate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "cartId": "707f1f77bcf86cd799439040",
    "clientCustomerPhone": "9891112222",
    "totalAmount": 5000,
    "paidAmount": 2000,
    "notes": "Partial payment received"
  }'
```

---

#### 2. Generate Invoice With Products

**Endpoint:** `POST /business/invoices/generatewithproducts`

**Purpose:** Create invoice directly with a products array (without using a cart).

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "clientCustomerId": "607f1f77bcf86cd799439030",
  "clientCustomerPhone": "9891112222",
  "clientCustomerName": "Bob Smith",
  "products": [
    {
      "productId": "507f1f77bcf86cd799439099",
      "quantity": 2
    }
  ],
  "invoiceNumber": "INV-CUSTOM-001",
  "invoiceDate": "2025-01-12T10:00:00.000Z",
  "dueDate": "2025-01-22T10:00:00.000Z",
  "subtotal": 5000,
  "totalTax": 0,
  "totalDiscount": 0,
  "totalAmount": 5000,
  "paidAmount": 5000,
  "notes": "Full payment received"
}
```

##### Request Parameters

| Field                    | Type   | Required | Description                        | Constraints                              |
| ------------------------ | ------ | -------- | ---------------------------------- | ---------------------------------------- |
| `clientId`               | string | ✅       | Client's ObjectId                  | Valid ObjectId                           |
| `products`               | array  | ✅       | Array of product objects           | At least one product required            |
| `products[].productId`   | string | ❌       | Item's ObjectId (for stock update) | Valid ObjectId                           |
| `products[].itemName`    | string | ❌       | Product name for invoice           | Default: "Unknown Item"                  |
| `products[].costPerUnit` | number | ✅       | Unit price                         | Positive number                          |
| `products[].quantity`    | number | ✅       | Quantity                           | Positive integer                         |
| `clientCustomerId`       | string | ❌       | clientCustomer's ObjectId          | Valid ObjectId                           |
| `clientCustomerPhone`    | string | ❌       | Client clientCustomer phone        | For auto-creating client clientCustomer  |
| `clientCustomerName`     | string | ❌       | Client clientCustomer name         | For auto-creating client clientCustomer  |
| `invoiceNumber`          | string | ❌       | Custom invoice number              | Auto-generated if not provided           |
| `invoiceDate`            | date   | ❌       | Invoice date                       | ISO date string                          |
| `dueDate`                | date   | ❌       | Payment due date                   | ISO date string                          |
| `subtotal`               | number | ❌       | Subtotal before tax/discount       | Calculated from products if not provided |
| `totalTax`               | number | ❌       | Total tax amount                   | Default: 0                               |
| `totalDiscount`          | number | ❌       | Total discount amount              | Default: 0                               |
| `totalAmount`            | number | ❌       | Invoice total                      | Calculated if not provided               |
| `paidAmount`             | number | ❌       | Amount paid                        | 0 to totalAmount, default: 0             |
| `notes`                  | string | ❌       | Invoice notes                      | Max 500 chars                            |

##### Success Response (201)

```json
{
  "success": true,
  "invoice": {
    "_id": "907f1f77bcf86cd799439060",
    "invoiceNumber": "INV-1704967200000",
    "clientId": "507f1f77bcf86cd799439011",
    "clientCustomerId": "607f1f77bcf86cd799439030",
    "clientCustomerName": "Bob Smith",
    "clientCustomerPhone": "9891112222",
    "subtotal": 5000,
    "totalTax": 0,
    "totalDiscount": 0,
    "totalAmount": 5000,
    "paidAmount": 5000,
    "isFinalized": true,
    "notes": "Full payment received",
    "products": [
      {
        "productId": "507f1f77bcf86cd799439099",
        "itemName": "Carburetor",
        "itemGroup": "Engine Parts",
        "quantity": 2,
        "costPerUnit": 2500
      }
    ],
    "createdAt": "2025-01-12T10:00:00.000Z",
    "updatedAt": "2025-01-12T10:00:00.000Z"
  }
}
```

##### Error Responses

**400 - Empty Products Array**

```json
{
  "success": false,
  "message": "Products array is required and cannot be empty"
}
```

**400 - Invalid Payment**

```json
{
  "success": false,
  "message": "Paid amount cannot exceed total amount"
}
```

**400 - Negative Payment**

```json
{
  "success": false,
  "message": "Paid amount cannot be negative"
}
```

##### Business Logic

1. **Direct Products:** No cart required - products are passed directly in the request
2. **Subtotal Calculation:** Auto-calculated from products if not provided
3. **Total Calculation:** `subtotal + totalTax - totalDiscount` if not provided
4. **clientCustomer Resolution:** Auto-creates clientCustomer from phone if not exists
5. **Stock Update:** Item stock decremented for products with valid `productId`
6. **Payment Recording:** If paidAmount > 0, payment record created
7. **Snapshot Products:** Response includes item snapshots with `itemName`, `itemGroup`, `quantity`, `costPerUnit` derived from `productId`
8. **Finalization:** `isFinalized` is derived from paid vs total (`paidAmount >= totalAmount`)
9. **Purchase History:** If fully paid at creation and clientCustomer exists, one PurchaseHistory record is created

##### Constraints

- Products array must have at least one item
- Each product must have `productId` and `quantity`
- paidAmount cannot exceed totalAmount
- paidAmount cannot be negative
- Invoice number auto-generated if not provided (timestamp-based)

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/invoices/generatewithproducts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "clientCustomerId": "607f1f77bcf86cd799439030",
    "products": [
      {
        "productId": "507f1f77bcf86cd799439099",
        "itemName": "Carburetor",
        "costPerUnit": 2500,
        "quantity": 2
      }
    ],
    "totalAmount": 5000,
    "paidAmount": 5000,
    "notes": "Full payment received"
  }'
```

---

#### 3. Record Payment

**Endpoint:** `POST /business/invoices/pay`

**Purpose:** Record additional payment against existing invoice.

**Authentication:** Bearer Token (JWT required)

##### Request Body

```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "invoiceId": "907f1f77bcf86cd799439060",
  "amount": 3000,
  "method": "cash",
  "note": "clientCustomer paid remainder"
}
```

##### Request Parameters

| Field       | Type   | Required | Description        | Constraints                            |
| ----------- | ------ | -------- | ------------------ | -------------------------------------- |
| `clientId`  | string | ✅       | Client's ObjectId  | Valid ObjectId                         |
| `invoiceId` | string | ✅       | Invoice's ObjectId | Valid ObjectId                         |
| `amount`    | number | ✅       | Payment amount     | > 0                                    |
| `method`    | string | ❌       | Payment method     | `cash`, `card`, `upi`, `bank`, `other` |
| `note`      | string | ❌       | Payment note       | Max 500 chars                          |

##### Success Response (200)

```json
{
  "success": true,
  "payment": {
    "_id": "b07f1f77bcf86cd799439080",
    "clientId": "507f1f77bcf86cd799439011",
    "invoiceId": "907f1f77bcf86cd799439060",
    "amount": 3000,
    "method": "cash",
    "note": "clientCustomer paid remainder",
    "createdAt": "2025-01-12T11:00:00.000Z",
    "updatedAt": "2025-01-12T11:00:00.000Z"
  },
  "invoice": {
    "_id": "907f1f77bcf86cd799439060",
    "invoiceNumber": "INV-1704967200000",
    "clientId": "507f1f77bcf86cd799439011",
    "clientCustomerId": "607f1f77bcf86cd799439030",
    "clientCustomerPhone": "9891112222",
    "totalAmount": 5000,
    "paidAmount": 5000,
    "isFinalized": true,
    "products": [
      {
        "_id": "507f1f77bcf86cd799439099",
        "name": "Carburetor",
        "price": 2500,
        "stock": 8,
        "unit": "nos",
        "quantity": 2,
        "costPerUnit": 2500
      }
    ],
    "updatedAt": "2025-01-12T11:00:00.000Z"
  }
}
```

##### Flow Diagram

```mermaid
sequenceDiagram
    participant App
    participant API
    participant BizSvc
    participant DB

    App->>API: POST /invoices/pay
    API->>BizSvc: Process payment
    BizSvc->>DB: Get Invoice
    DB-->>BizSvc: Invoice data
    BizSvc->>DB: Create Payment record
    BizSvc->>DB: Update Invoice.paidAmount
    BizSvc->>BizSvc: Check if paidAmount >= totalAmount
    alt Fully Paid
        BizSvc->>DB: Set isFinalized: true
        BizSvc->>DB: Create PurchaseHistory
        BizSvc-->>API: Finalized
    else Partially Paid
        BizSvc-->>API: Still pending
    end
    API-->>App: {payment, invoice}
```

##### Business Logic

1. Create Payment record
2. Update Invoice.paidAmount (accumulate)
3. Hydrate invoice products with full item details (no `productId` in response)
4. If paidAmount >= totalAmount:

- Set `isFinalized: true`
- Create PurchaseHistory (if not already exists)

##### Constraints

- Multiple payments allowed per invoice
- Each payment creates separate Payment record
- Amount must be positive and <= remaining balance
- Auto-finalization when balance cleared
- Cannot overpay (validation on remaining balance)

##### cURL Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/invoices/pay \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "507f1f77bcf86cd799439011",
    "invoiceId": "907f1f77bcf86cd799439060",
    "amount": 3000,
    "method": "cash",
    "note": "Remainder payment"
  }'
```

---

#### 4. Get Invoice Payments

**Endpoint:** `GET /business/invoices/:invoiceId/payments`

**Purpose:** Retrieve all payments for an invoice.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter   | Type   | Required | Description        |
| ----------- | ------ | -------- | ------------------ |
| `invoiceId` | string | ✅       | Invoice's ObjectId |

##### Query Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "payments": [
    {
      "_id": "b07f1f77bcf86cd799439080",
      "clientId": "507f1f77bcf86cd799439011",
      "invoiceId": "907f1f77bcf86cd799439060",
      "amount": 2000,
      "method": "cash",
      "note": "Initial payment",
      "createdAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "c07f1f77bcf86cd799439090",
      "clientId": "507f1f77bcf86cd799439011",
      "invoiceId": "907f1f77bcf86cd799439060",
      "amount": 3000,
      "method": "upi",
      "note": "Remainder payment",
      "createdAt": "2025-01-12T11:00:00.000Z"
    }
  ]
}
```

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/business/invoices/907f1f77bcf86cd799439060/payments?clientId=507f1f77bcf86cd799439011"
```

---

#### 5. Get All Invoices

**Endpoint:** `GET /business/invoices/:clientId`

**Purpose:** Retrieve all invoices for a client.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "invoices": [
    {
      "_id": "907f1f77bcf86cd799439060",
      "invoiceNumber": "INV-1704967200000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": {
        "_id": "607f1f77bcf86cd799439030",
        "phoneNumber": "9891112222",
        "name": "Bob Smith"
      },
      "subtotal": 5000,
      "totalTax": 0,
      "totalDiscount": 0,
      "totalAmount": 5000,
      "paidAmount": 5000,
      "isFinalized": true,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439099",
          "name": "Carburetor",
          "price": 2500,
          "stock": 8,
          "unit": "nos",
          "description": "Engine carburetor",
          "isActive": true,
          "quantity": 2,
          "costPerUnit": 2500
        }
      ],
      "generatedAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "907f1f77bcf86cd799439061",
      "invoiceNumber": "INV-1704880800000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": {
        "_id": "607f1f77bcf86cd799439031",
        "phoneNumber": "9891113333",
        "name": "Alice Brown"
      },
      "subtotal": 3600,
      "totalTax": 0,
      "totalDiscount": 0,
      "totalAmount": 3600,
      "paidAmount": 3600,
      "isFinalized": true,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439021",
          "name": "Brake Pad Set",
          "price": 1200,
          "stock": 28,
          "unit": "nos",
          "description": "High-quality brake pads",
          "isActive": true,
          "quantity": 3,
          "costPerUnit": 1200
        }
      ],
      "generatedAt": "2025-01-11T10:00:00.000Z"
    }
  ]
}
```

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/business/invoices/507f1f77bcf86cd799439011
```

---

### Reports

Analytics and reporting endpoints.

---

#### 1. Get Pending Invoices

**Endpoint:** `GET /business/pending-invoices/:clientId`

**Purpose:** Retrieve all unpaid/partially paid invoices.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "pendingInvoices": [
    {
      "_id": "907f1f77bcf86cd799439060",
      "invoiceNumber": "INV-1704967200000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": "607f1f77bcf86cd799439030",
      "clientCustomerName": "Bob Smith",
      "clientCustomerPhone": "9891112222",
      "totalAmount": 5000,
      "paidAmount": 2000,
      "pendingAmount": 3000,
      "isFinalized": false,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439099",
          "name": "Carburetor",
          "price": 2500,
          "stock": 8,
          "unit": "nos",
          "quantity": 2,
          "costPerUnit": 2500
        }
      ],
      "generatedAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "907f1f77bcf86cd799439061",
      "invoiceNumber": "INV-1704880800000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": "607f1f77bcf86cd799439031",
      "clientCustomerName": "Alice Brown",
      "clientCustomerPhone": "9891113333",
      "totalAmount": 3600,
      "paidAmount": 1000,
      "pendingAmount": 2600,
      "isFinalized": false,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439021",
          "name": "Brake Pad Set",
          "price": 1200,
          "stock": 28,
          "unit": "nos",
          "quantity": 3,
          "costPerUnit": 1200
        }
      ],
      "generatedAt": "2025-01-11T10:00:00.000Z"
    }
  ]
}
```

##### Constraints

- Returns only invoices where `isFinalized: false`
- Calculates pendingAmount = totalAmount - paidAmount
- Includes product snapshots (`itemName`, `itemGroup`, `quantity`, `costPerUnit`)
- Sorted by generatedAt (newest first)

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/business/pending-invoices/507f1f77bcf86cd799439011
```

---

#### 2. Get Pending Invoices (By Client Customer)

**Endpoint:** `GET /business/pending-invoices/:clientId/:clientCustomerId`

**Purpose:** Retrieve all unpaid/partially paid invoices for a specific client customer.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter          | Type   | Required | Description              |
| ------------------ | ------ | -------- | ------------------------ |
| `clientId`         | string | ✅       | Client's ObjectId        |
| `clientCustomerId` | string | ✅       | Client customer ObjectId |

##### Query Parameters

| Parameter             | Type   | Required | Description                    |
| --------------------- | ------ | -------- | ------------------------------ |
| `clientCustomerPhone` | string | ❌       | Filter by clientCustomer phone |

##### Success Response (200)

```json
{
  "success": true,
  "pendingInvoices": [
    {
      "_id": "907f1f77bcf86cd799439060",
      "invoiceNumber": "INV-1704967200000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": "607f1f77bcf86cd799439030",
      "clientCustomerName": "Bob Smith",
      "clientCustomerPhone": "9891112222",
      "totalAmount": 5000,
      "paidAmount": 2000,
      "pendingAmount": 3000,
      "isFinalized": false,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439099",
          "name": "Carburetor",
          "price": 2500,
          "stock": 8,
          "unit": "nos",
          "quantity": 2,
          "costPerUnit": 2500
        }
      ],
      "generatedAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "907f1f77bcf86cd799439062",
      "invoiceNumber": "INV-1704794400000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": "607f1f77bcf86cd799439030",
      "clientCustomerName": "Bob Smith",
      "clientCustomerPhone": "9891112222",
      "totalAmount": 2400,
      "paidAmount": 1000,
      "pendingAmount": 1400,
      "isFinalized": false,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439021",
          "name": "Brake Pad Set",
          "price": 1200,
          "stock": 28,
          "unit": "nos",
          "quantity": 2,
          "costPerUnit": 1200
        }
      ],
      "generatedAt": "2025-01-10T10:00:00.000Z"
    }
  ]
}
```

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/business/pending-invoices/507f1f77bcf86cd799439011/607f1f77bcf86cd799439030"
```

---

#### 3. Get Paid Invoices (By Client Customer)

**Endpoint:** `GET /business/paid-invoices/:clientId/:clientCustomerId`

**Purpose:** Retrieve all fully paid invoices for a specific client customer.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter          | Type   | Required | Description              |
| ------------------ | ------ | -------- | ------------------------ |
| `clientId`         | string | ✅       | Client's ObjectId        |
| `clientCustomerId` | string | ✅       | Client customer ObjectId |

##### Query Parameters

| Parameter             | Type   | Required | Description                    |
| --------------------- | ------ | -------- | ------------------------------ |
| `clientCustomerPhone` | string | ❌       | Filter by clientCustomer phone |

##### Success Response (200)

```json
{
  "success": true,
  "invoices": [
    {
      "_id": "907f1f77bcf86cd799439060",
      "invoiceNumber": "INV-1704967200000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": "607f1f77bcf86cd799439030",
      "clientCustomerName": "Bob Smith",
      "clientCustomerPhone": "9891112222",
      "totalAmount": 5000,
      "paidAmount": 5000,
      "isFinalized": true,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439099",
          "name": "Carburetor",
          "price": 2500,
          "stock": 8,
          "unit": "nos",
          "quantity": 2,
          "costPerUnit": 2500
        }
      ],
      "generatedAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "907f1f77bcf86cd799439063",
      "invoiceNumber": "INV-1704708000000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": "607f1f77bcf86cd799439030",
      "clientCustomerName": "Bob Smith",
      "clientCustomerPhone": "9891112222",
      "totalAmount": 3600,
      "paidAmount": 3600,
      "isFinalized": true,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439021",
          "name": "Brake Pad Set",
          "price": 1200,
          "stock": 28,
          "unit": "nos",
          "quantity": 3,
          "costPerUnit": 1200
        }
      ],
      "generatedAt": "2025-01-09T10:00:00.000Z"
    }
  ]
}
  ]
}
```

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/business/paid-invoices/507f1f77bcf86cd799439011/607f1f77bcf86cd799439030"
```

---

#### 4. Get Payment Report

**Endpoint:** `GET /business/payment-report/:clientId`

**Purpose:** Detailed payment breakdown and statistics.

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Success Response (200)

```json
{
  "success": true,
  "report": [
    {
      "_id": "907f1f77bcf86cd799439060",
      "invoiceNumber": "INV-1704967200000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerId": "607f1f77bcf86cd799439030",
      "clientCustomerName": "Bob Smith",
      "clientCustomerPhone": "9891112222",
      "totalAmount": 5000,
      "paidAmount": 5000,
      "isFinalized": true,
      "products": [
        {
          "_id": "507f1f77bcf86cd799439099",
          "name": "Carburetor",
          "price": 2500,
          "stock": 8,
          "unit": "nos",
          "quantity": 2,
          "costPerUnit": 2500
        }
      ],
      "createdAt": "2025-01-12T10:00:00.000Z"
    },
    {
      "_id": "907f1f77bcf86cd799439061",
      "invoiceNumber": "INV-1704967300000",
      "clientId": "507f1f77bcf86cd799439011",
      "clientCustomerName": "Alice Johnson",
      "clientCustomerPhone": "9890000000",
      "totalAmount": 3000,
      "paidAmount": 1500,
      "isFinalized": false,
      "products": [],
      "createdAt": "2025-01-12T11:00:00.000Z"
    }
  ],
  "summary": {
    "totalInvoices": 2,
    "totalAmount": 8000,
    "totalPaid": 6500,
    "totalPending": 1500
  }
}
```

##### Response Fields

**report[]:**

- Invoice-wise breakdown
- clientCustomer details
- Payment status

**summary:**

- `totalInvoices`: Count of invoices returned
- `totalAmount`: Sum of all invoice amounts
- `totalPaid`: Sum of all payments received
- `totalPending`: Sum of all pending balances

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/business/payment-report/507f1f77bcf86cd799439011
```

---

#### 5. Get Purchase History

**Endpoint:** `GET /business/purchase-history/:clientId`

**Purpose:** Retrieve purchase history (finalized invoices only).

**Authentication:** Bearer Token (JWT required)

##### Path Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| `clientId` | string | ✅       | Client's ObjectId |

##### Query Parameters

| Parameter             | Type   | Required | Description                        |
| --------------------- | ------ | -------- | ---------------------------------- |
| `clientCustomerId`    | string | ❌       | Filter by client clientCustomer ID |
| `clientCustomerPhone` | string | ❌       | Filter by clientCustomer phone     |

##### Success Response (200)

```json
{
  "success": true,
  "data": {
    "purchaseHistory": [
      {
        "_id": "d07f1f77bcf86cd7994390a0",
        "invoiceId": "907f1f77bcf86cd799439060",
        "clientCustomerId": "607f1f77bcf86cd799439030",
        "totalAmount": 5000,
        "purchasedAt": "2025-01-12T10:00:00.000Z",
        "invoiceNumber": "INV-1704967200000"
      }
    ]
  }
}
```

##### Constraints

- Only includes **finalized** invoices (`isFinalized: true`)
- Supports filtering by client clientCustomer ID or phone
- Sorted by purchasedAt (newest first)

##### cURL Examples

```bash
# Get all purchase history
curl -X GET https://viveha-backend.onrender.com/api/business/purchase-history/507f1f77bcf86cd799439011

# Filter by client clientCustomer ID
curl -X GET "https://viveha-backend.onrender.com/api/business/purchase-history/507f1f77bcf86cd799439011?clientCustomerId=607f1f77bcf86cd799439030"

# Filter by clientCustomer phone (offline support)
curl -X GET "https://viveha-backend.onrender.com/api/business/purchase-history/507f1f77bcf86cd799439011?clientCustomerPhone=9891112222"
```

---

### Dashboard

Read-only dashboard endpoints for summary cards, sales trends, and top items.

**Authentication:** Bearer Token (JWT required)

---

#### 1. Get Business Summary (Top Cards)

**Endpoint:** `GET /dashboard/summary`

**Purpose:** Return total sales, pending amount, and pending invoices count.

##### Success Response (200)

```json
{
  "totalSales": 125000,
  "pendingAmount": 18000,
  "pendingInvoices": 3
}
```

##### Notes

- `totalSales` = sum of fully paid invoices (`paidAmount >= totalAmount`).
- `pendingAmount` = sum of remaining balances (`totalAmount - paidAmount`) for unpaid/partial invoices.
- `pendingInvoices` = count of unpaid/partial invoices.

##### cURL Example

```bash
curl -X GET https://viveha-backend.onrender.com/api/dashboard/summary \
  -H "Authorization: Bearer <token>"
```

---

#### 2. Get Sales Trend (Last N Months)

**Endpoint:** `GET /dashboard/sales-trends?months=6`

**Purpose:** Return month-wise paid sales totals for the last N months.

##### Query Parameters

| Parameter | Type   | Required | Description                       | Default | Validation             |
| --------- | ------ | -------- | --------------------------------- | ------- | ---------------------- |
| `months`  | number | ❌       | Number of months to return (1–24) | 6       | Must be integer (1-24) |

##### Validation Rules

- `months` must be a whole number
- Minimum value: 1
- Maximum value: 24
- Invalid values return 400 Bad Request with validation error

##### Success Response (200)

```json
[
  { "month": "Aug", "amount": 12000 },
  { "month": "Sep", "amount": 18000 },
  { "month": "Oct", "amount": 15000 },
  { "month": "Nov", "amount": 22000 },
  { "month": "Dec", "amount": 30000 },
  { "month": "Jan", "amount": 28000 }
]
```

##### Error Response (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["months: Months must be at least 1"]
}
```

##### Notes

- Only fully paid invoices are included.
- Months with no sales return `amount: 0`.

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/dashboard/sales-trends?months=6" \
  -H "Authorization: Bearer <token>"
```

---

#### 3. Get Top Selling Items

**Endpoint:** `GET /dashboard/top-items?limit=5`

**Purpose:** Return top selling items grouped by product.

##### Query Parameters

| Parameter | Type   | Required | Description                      | Default | Validation             |
| --------- | ------ | -------- | -------------------------------- | ------- | ---------------------- |
| `limit`   | number | ❌       | Number of items to return (1–50) | 5       | Must be integer (1-50) |

##### Validation Rules

- `limit` must be a whole number
- Minimum value: 1
- Maximum value: 50
- Invalid values return 400 Bad Request with validation error

##### Success Response (200)

```json
[
  { "itemName": "Product A", "quantity": 120, "amount": 24000 },
  { "itemName": "Product B", "quantity": 90, "amount": 18000 }
]
```

##### Error Response (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["limit: Limit must be at least 1"]
}
```

##### Notes

- Aggregates invoice product snapshots.

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/dashboard/top-items?limit=5" \
  -H "Authorization: Bearer <token>"
```

---

#### 4. Get Full Dashboard (Single API)

**Endpoint:** `GET /dashboard`

**Purpose:** Return full dashboard payload in a single request.

##### Query Parameters

| Parameter | Type   | Required | Description                       | Default | Validation             |
| --------- | ------ | -------- | --------------------------------- | ------- | ---------------------- |
| `months`  | number | ❌       | Number of months to return (1–24) | 6       | Must be integer (1-24) |
| `limit`   | number | ❌       | Number of items to return (1–50)  | 5       | Must be integer (1-50) |

##### Validation Rules

- `months` must be a whole number between 1 and 24
- `limit` must be a whole number between 1 and 50
- Invalid values return 400 Bad Request with validation error

##### Success Response (200)

```json
{
  "summary": {
    "totalSales": 125000,
    "pendingAmount": 18000,
    "pendingInvoices": 3
  },
  "salesTrends": [
    { "month": "Aug", "amount": 12000 },
    { "month": "Sep", "amount": 18000 },
    { "month": "Oct", "amount": 15000 },
    { "month": "Nov", "amount": 22000 },
    { "month": "Dec", "amount": 30000 },
    { "month": "Jan", "amount": 28000 }
  ],
  "topItems": [{ "itemName": "Product A", "quantity": 120, "amount": 24000 }]
}
```

##### Error Response (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "months: Months cannot exceed 24",
    "limit: Limit must be at least 1"
  ]
}
```

##### cURL Example

```bash
curl -X GET "https://viveha-backend.onrender.com/api/dashboard?months=12&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

## Sync (Offline)

Sync offline operations (items, invoices, payments) in a single request and return the full dataset for the client.

**Authentication:** Bearer Token (JWT required)

---

### 1. Ready to Sync

Check whether the session is valid for offline sync.

**Endpoint:** `POST /readytosync`

**Request Body:** _None_

#### Success Response (200)

```json
{
  "success": true,
  "message": "OK",
  "clientId": "507f1f77bcf86cd799439011"
}
```

---

### 2. Sync Offline Data

**Endpoint:** `POST /sync`

**Purpose:** Apply offline item/invoice/payment operations and return full client data.

#### Request Body

```json
{
  "item": {
    "create": [
      {
        "name": "Oil Filter",
        "price": 120,
        "stock": 50,
        "unit": "nos",
        "description": "Premium oil filter"
      },
      {
        "name": "Oil pump ",
        "price": 120,
        "stock": 50,
        "unit": "nos",
        "description": "Premium oil pump"
      },
      {
        "name": "Oil reducer",
        "price": 120,
        "stock": 50,
        "unit": "nos",
        "description": "Premium oil reducer"
      }
    ],
    "update": [
      {
        "_id": "507f1f77bcf86cd799439099",
        "price": 140,
        "stock": 42
      }
    ],
    "delete": ["507f1f77bcf86cd799439098"]
  },
  "invoice": {
    "create": [
      {
        "invoiceNumber": "INV-OFFLINE-1002",
        "clientCustomerId": "607f1f77bcf86cd799439031",
        "clientCustomerName": "Arun Kumar",
        "clientCustomerPhone": "9840012345",
        "products": [
          {
            "productId": "507f1f77bcf86cd799439101", //if this product is added offline skip this server create new product
            "itemName": "Brake Pad Set",
            "quantity": 4,
            "costPerUnit": 850,
            "itemGroup": "Brake System"
          }
        ],
        "subtotal": 3400,
        "totalAmount": 3400,
        "paidAmount": 0,
        "notes": "Offline invoice"
      },
      {
        "invoiceNumber": "INV-OFFLINE-1003",
        "clientCustomerId": "607f1f77bcf86cd799439032",
        "clientCustomerName": "Ravi Shankar",
        "clientCustomerPhone": "9003215678",
        "products": [
          {
            "productId": "507f1f77bcf86cd799439102",
            "itemName": "Clutch Plate",
            "quantity": 1,
            "costPerUnit": 4200,
            "itemGroup": "Transmission"
          }
        ],
        "subtotal": 4200,
        "totalAmount": 4200,
        "paidAmount": 0,
        "notes": "Offline invoice"
      }
    ]
  },
  "payment": {
    "create": [
      {
        "invoiceId": "907f1f77bcf86cd799439060",
        "amount": 500,
        "method": "cash",
        "note": "Offline payment",
        "paidAt": "2025-01-12T10:05:00.000Z"
      }
    ]
  }
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "summary": {
    "itemsCreated": 1,
    "itemsUpdated": 1,
    "itemsDeleted": 1,
    "invoicesCreated": 1,
    "paymentsCreated": 1
  },

  "data": {
    "itemGroups": [give each and every item of this table of this client],
    "items": [give each and every item of this table of this client],
    "clientCustomers": [give each and every item of this table of this client],
    "invoices": [give each and every item of this table of this client],
    "payments": [give each and every item of this table of this client],
    "purchaseHistory": [give each and every item of this table of this client]
  }
}
```

#### Notes

- Arrays in `item`, `invoice`, and `payment` can contain any number of records (including zero).
- `item.create` must not include `_id`.
- `item.update` must include `_id` from server.
- `item.delete` should include item IDs from server.
- `payment.create` requires `invoiceId` from server.
- If you send payment records for an invoice, avoid duplicating those amounts in `invoice.paidAmount`.
- `synced` returns the server-generated IDs for records created/updated/deleted in this sync.
- `data` returns **all** records for the client (including inactive items marked with `isActive: false`).

---

## System

### Health Check

**Endpoint:** `GET /health`

**Purpose:** Verify server availability and database connectivity.

**Authentication:** None (public). This endpoint remains public and is not affected by sync authentication.

#### Success Response (200)

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-28T05:43:02.381Z"
}
```

---

## ⚠️ Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Error code or type" // Optional
}
```

### Common Errors

#### 400 - Bad Request

**Validation Error:**

```json
{
  "success": false,
  "message": "Phone number is required"
}
```

**Business Logic Error:**

```json
{
  "success": false,
  "message": "Cart is empty"
}
```

#### 401 - Unauthorized

```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

#### 404 - Not Found

```json
{
  "success": false,
  "message": "Client not found"
}
```

#### 409 - Conflict

```json
{
  "success": false,
  "message": "Phone number already registered"
}
```

#### 500 - Internal Server Error

```json
{
  "success": false,
  "message": "An unexpected error occurred"
}
```

---

## 🚦 Rate Limiting

Rate limiting is enforced to prevent abuse and ensure service availability.

### OTP Rate Limits

| Endpoint             | Limit      | Window     | Description    |
| -------------------- | ---------- | ---------- | -------------- |
| `POST /otp/send`     | 5 requests | 15 minutes | Per IP address |
| `POST /mockotp/send` | 5 requests | 15 minutes | Per IP address |

- **5 verification attempts** per OTP session
- Auto-reset after lockout period

### Authentication Rate Limits

| Endpoint              | Limit       | Window     | Description    |
| --------------------- | ----------- | ---------- | -------------- |
| `POST /auth/register` | 10 requests | 15 minutes | Per IP address |
| `POST /auth/login`    | 10 requests | 15 minutes | Per IP address |

### General API Rate Limits

| Scope             | Limit        | Window   |
| ----------------- | ------------ | -------- |
| All API endpoints | 100 requests | 1 minute |

### Rate Limit Response

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

**HTTP Status:** `429 Too Many Requests`

### Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```

---

## �️ Security

### Security Headers

All API responses include security headers via [Helmet](https://helmetjs.github.io/):

| Header                            | Description                           |
| --------------------------------- | ------------------------------------- |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing           |
| `X-Frame-Options: SAMEORIGIN`     | Clickjacking protection               |
| `X-XSS-Protection: 0`             | Disabled (modern browsers handle XSS) |
| `Strict-Transport-Security`       | Enforces HTTPS (production)           |
| `Content-Security-Policy`         | Controls resource loading             |

### CORS Configuration

Cross-Origin Resource Sharing is configured via `CORS_ORIGINS` environment variable:

```bash
# Single origin
CORS_ORIGINS=https://myapp.com

# Multiple origins (comma-separated)
CORS_ORIGINS=https://myapp.com,https://admin.myapp.com
```

### Environment Variables

| Variable          | Required | Description                       | Default        |
| ----------------- | -------- | --------------------------------- | -------------- |
| `JWT_SECRET`      | ✅       | Secret key for JWT signing        | —              |
| `MONGO_URL`       | ✅       | MongoDB connection string         | —              |
| `PORT`            | ❌       | Server port                       | `10000`        |
| `NODE_ENV`        | ❌       | Environment mode                  | `development`  |
| `CORS_ORIGINS`    | ❌       | Allowed origins (comma-separated) | `*` (dev only) |
| `FACTOR_API_Key`  | ❌       | 2Factor.in API key for SMS        | —              |
| `ADMIN_API_TOKEN` | ❌       | Admin endpoint authentication     | —              |

---

## �🔁 Idempotency

### Purpose

Prevent duplicate operations during offline sync and retries.

### Usage

Include `X-Idempotency-Key` header in mutation requests:

```http
X-Idempotency-Key: req_12345_1704967200000
```

### Supported Endpoints

- `POST /auth/register`
- `POST /business/invoices/generate`
- `POST /business/invoices/pay`
- `PUT /auth/client/:clientId`

### Behavior

1. Server stores requestId with result
2. Duplicate requests return cached response
3. Safe for retries without side effects

### Example

```bash
curl -X POST https://viveha-backend.onrender.com/api/business/invoices/generate \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: req_invoice_abc123_1704967200000" \
  -d '{...}'
```

---

## 📖 Additional Resources

- **README.md**: Architecture, schemas, deployment
- **Postman Collection**: `Viveka_API_Test_Suite.postman_collection.json`
- **Postman Environment**: `Viveka_Development.postman_environment.json`
- **Production URL**: `https://viveha-backend.onrender.com/api`

---

## 👥 Team

**Team Isaii AI**

For support or questions, please contact the development team.

---

**Last Updated:** February 7, 2026  
**API Version:** 1.1.0

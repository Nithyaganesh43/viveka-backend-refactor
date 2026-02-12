# Auth & OTP Module – Core Concept & System Rules

## Purpose

The Auth & OTP Module handles **identity verification and session management** for the Viveka system.

This module is the **single source of truth** for:

- User registration
- User authentication
- OTP generation and verification
- Session management
- Device policy enforcement

---

## Core Design Principles

1. **OTP-Only Authentication**
   - No passwords in the system
   - Phone number + OTP is the only auth method
   - Eliminates password-related vulnerabilities

2. **Phone is Identity**
   - Phone number is the unique identifier
   - One phone = one client account
   - Phone number cannot be changed

3. **Single Device Policy**
   - Only one active device per account
   - New login deactivates previous sessions
   - Prevents unauthorized concurrent access

4. **Stateless API, Stateful Sessions**
   - JWT tokens for API authentication
   - Device sessions tracked in database
   - Logout invalidates specific session

---

## OTP System

### OTP Generation

When OTP is requested:

1. Generate 4-digit random OTP
2. Hash OTP for storage (SHA-256)
3. Create OTP session with expiry
4. Send OTP via SMS gateway
5. Return success with expiry info

### OTP Configuration

| Setting        | Value       |
| -------------- | ----------- |
| OTP Length     | 4 digits    |
| TTL            | 600 seconds |
| Max Attempts   | 5           |
| Hash Algorithm | SHA-256     |

### OTP Purposes

| Purpose    | Description              |
| ---------- | ------------------------ |
| `register` | New account registration |
| `login`    | Existing account login   |

Only these two purposes are allowed.

---

## OTP Session Entity

Tracks pending OTP verifications.

| Field         | Description            |
| ------------- | ---------------------- |
| `phoneNumber` | Target phone number    |
| `purpose`     | 'register' or 'login'  |
| `otpHash`     | SHA-256 hash of OTP    |
| `expiresAt`   | Expiration timestamp   |
| `isVerified`  | Verification status    |
| `attempts`    | Failed attempt counter |

---

## OTP Operations

### Send OTP

**Input:**

- `phoneNumber` — Target phone number
- `purpose` — 'register' or 'login'

**Validation:**

For `register`:

- Phone must NOT be registered
- Prevents re-registration

For `login`:

- Phone MUST be registered
- Account must be active
- Prevents login to non-existent accounts

**Process:**

1. Delete any existing OTP session for this phone/purpose
2. Generate new OTP
3. Create OTP session
4. Send via SMS gateway
5. Return expiry info

**Response:**

```javascript
{
  success: true,
  message: 'OTP sent successfully',
  phoneNumber: '...',
  expiresInSeconds: 600
}
```

---

### Verify OTP

**Input:**

- `phoneNumber` — Phone number
- `otp` — OTP to verify
- `purpose` — 'register' or 'login'
- `consume` — Whether to delete session after verify (default: true)

**Validation Checks:**

1. OTP session exists
2. Session not expired
3. Max attempts not exceeded
4. OTP hash matches

**On Failure:**

- Increment attempt counter
- Return error message
- Delete session if max attempts exceeded

**On Success:**

- If `consume: true` → Delete session
- If `consume: false` → Mark as verified
- Return success

---

## Authentication Flow

### Registration Flow

```
1. User → Send OTP (purpose: register)
2. System → Validate phone not registered
3. System → Send OTP
4. User → Submit registration with OTP
5. System → Verify OTP
6. System → Create client account
7. System → Create device session
8. System → Issue JWT token
9. User → Logged in
```

### Login Flow

```
1. User → Send OTP (purpose: login)
2. System → Validate phone is registered
3. System → Validate account is active
4. System → Send OTP
5. User → Submit login with OTP
6. System → Verify OTP
7. System → Create/update device session
8. System → Deactivate other sessions
9. System → Issue JWT token
10. User → Logged in
```

### Logout Flow

```
1. User → Request logout
2. System → Extract session from JWT
3. System → Deactivate session
4. User → Logged out
```

---

## Device Session Entity

Tracks active login sessions.

| Field        | Description                |
| ------------ | -------------------------- |
| `clientId`   | The client account         |
| `deviceId`   | Device identifier          |
| `isActive`   | Session active status      |
| `lastSeenAt` | Last activity timestamp    |
| `createdAt`  | Session creation timestamp |

---

## Single Device Policy

**Rule:** Only one active session per client at any time.

**Enforcement:**

1. On login, upsert session for device
2. Mark new session as active
3. Deactivate ALL other sessions for client
4. Include session ID in JWT

**Effect:**

- Previous devices are automatically logged out
- No concurrent logins possible
- Device switch is seamless

---

## JWT Token Structure

```javascript
{
  clientId: "...",
  phoneNumber: "...",
  deviceSessionId: "...",
  iat: timestamp,
  exp: timestamp  // 30 days
}
```

### Token Lifecycle

- Issued on successful register/login
- Valid for 30 days
- Contains session reference
- Validated against active sessions

---

## Registration Details

**Required Fields:**

| Field          | Description         |
| -------------- | ------------------- |
| `phoneNumber`  | User's phone number |
| `otp`          | Verified OTP        |
| `ownerName`    | Business owner name |
| `businessName` | Business name       |

**Optional Fields:**

| Field        | Description       |
| ------------ | ----------------- |
| `deviceId`   | Device identifier |
| `shopName`   | Shop display name |
| `location`   | Address/location  |
| `city`       | City              |
| `state`      | State             |
| `gstin`      | GST number        |
| `profileUrl` | Profile image URL |

**Response:**

```javascript
{
  success: true,
  message: 'Client registered successfully',
  clientId: '...',
  phoneNumber: '...',
  ownerName: '...',
  businessName: '...',
  token: 'jwt_token',
  deviceSessionId: '...'
}
```

---

## Login Details

**Required Fields:**

| Field         | Description      |
| ------------- | ---------------- |
| `phoneNumber` | Registered phone |
| `otp`         | Verified OTP     |

**Optional Fields:**

| Field      | Description       |
| ---------- | ----------------- |
| `deviceId` | Device identifier |

**Response:**

```javascript
{
  success: true,
  message: 'OTP login successful',
  clientId: '...',
  token: 'jwt_token',
  deviceSessionId: '...',
  phoneNumber: '...'
}
```

---

## Logout Details

**Extracted from JWT:**

- `clientId`
- `deviceSessionId`

**Process:**

1. Find active session matching both IDs
2. Set `isActive: false`
3. Return success

**Response:**

```javascript
{
  success: true,
  message: 'Logout successful',
  deviceSessionId: '...'
}
```

---

## Security Considerations

### OTP Security

- OTP is never stored in plain text
- SHA-256 hashing prevents exposure
- Time-limited validity
- Attempt limiting prevents brute force
- Session deleted after max attempts

### SMS Gateway

- External service (2Factor.in)
- API key stored in environment
- Failure handling in place
- Rate limiting recommended

### JWT Security

- Secret stored in environment
- 30-day expiry balances security/convenience
- Session validation on each request
- Logout invalidates session, not token

---

## Error Handling

### OTP Errors

| Error                           | Cause                         |
| ------------------------------- | ----------------------------- |
| Phone number already registered | Register with existing phone  |
| Client not found                | Login with unregistered phone |
| Account is not active           | Login to deactivated account  |
| OTP not found                   | Verify without sending        |
| OTP session expired             | OTP older than 10 minutes     |
| Maximum attempts exceeded       | 5+ wrong OTP attempts         |
| Invalid OTP                     | Wrong OTP entered             |

### Auth Errors

| Error                           | Cause                      |
| ------------------------------- | -------------------------- |
| Phone number already registered | Duplicate registration     |
| Client not found                | Login non-existent account |
| Account is not active           | Deactivated account        |
| Session not found               | Invalid logout attempt     |

---

## Why This Design Works

- OTP-only eliminates password vulnerabilities
- Phone identity is simple and universal
- Single device policy prevents unauthorized access
- Stateless JWT enables scalable API
- Session tracking enables controlled logout

---

## Summary

The Auth & OTP Module is the **identity and access control layer** of Viveka.

- OTP is the only authentication method
- Phone number is the immutable identity
- Single device policy enforced
- JWT tokens enable stateless API access
- Sessions are tracked for controlled logout

If any future change introduces passwords or multi-device sessions without audit, it is **architecturally incorrect**.

---

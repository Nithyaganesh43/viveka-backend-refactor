# Viveka Backend API - Postman Test Suite

Complete A-Z testing guide for all Viveka backend APIs using Postman.

## 📋 Files Included

1. **Viveka_API_Test_Suite.postman_collection.json** - Complete API collection with 29 test endpoints
2. **Viveka_Development.postman_environment.json** - Development environment variables

## 🚀 Quick Start

### Prerequisites

- Postman installed (v9+)
- Node.js backend running on `http://localhost:5000`
- MongoDB running on `mongodb://localhost:27017/viveka`

### Step 1: Import Files to Postman

1. Open Postman
2. Click **Import** → Select **Viveka_API_Test_Suite.postman_collection.json**
3. Click **Import** → Select **Viveka_Development.postman_environment.json**
4. Select the **Viveka Backend - Development** environment from dropdown

### Step 2: Start Backend Server

```bash
cd Backend
npm install  # Install dependencies (bcrypt, jsonwebtoken, mongoose, express, dotenv)
npm start    # Start server on port 5000
```

Server should show:

```
✅ Server is running
📡 Port: 5000
✅ MongoDB connected successfully
```

---

## 📚 Testing Sequence (A-Z)

### **Phase 1: OTP Management** (Steps 1-3)

#### 1️⃣ Send OTP (Mock Print)

- **Method:** POST
- **Endpoint:** `/api/otp/send`
- **Body:**
  ```json
  {
    "phoneNumber": "9876543210"
  }
  ```
- **Response:** OTP printed in server console (4 digits)
- **Note:** Check server logs for the OTP!

#### 2️⃣ Verify OTP

- **Method:** POST
- **Endpoint:** `/api/otp/verify`
- **Body:**
  ```json
  {
    "phoneNumber": "9876543210",
    "otp": "1234" // Use the OTP from step 1
  }
  ```
- **Response:** Verification successful

#### 3️⃣ Clear OTP Session

- **Method:** POST
- **Endpoint:** `/api/otp/clear`
- **Body:**
  ```json
  {
    "phoneNumber": "9876543210"
  }
  ```
- **Response:** Session cleared

---

## 📞 API Summary

| #     | Feature     | Method              | Endpoint                 |
| ----- | ----------- | ------------------- | ------------------------ |
| 1-3   | OTP         | POST                | /otp/\*                  |
| 4-7   | Auth        | POST/GET            | /auth/\*                 |
| 8-11  | Item Groups | POST/GET/PUT/DELETE | /business/item-groups/\* |
| 12-16 | Items       | POST/GET/PUT/DELETE | /business/items/\*       |
| 17-18 | Customers   | POST/GET            | /business/customers/\*   |
| 19-23 | Cart        | POST/GET            | /business/carts/\*       |
| 24-28 | Invoices    | POST/GET            | /business/invoices/\*    |
| 29    | Health      | GET                 | /health                  |

---

**Happy Testing! 🚀**

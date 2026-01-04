import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

// Import routes
import otpRoutes from './src/api/routes/otpRoutes.js';
import authRoutes from './src/api/routes/authRoutes.js';
import businessRoutes from './src/api/routes/businessRoutes.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTES
// ============================================================================

// OTP Routes
app.use('/api/otp', otpRoutes);

// Auth Routes
app.use('/api/auth', authRoutes);

// Business Routes (Items, Carts, Invoices, etc.)
app.use('/api/business', businessRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================================
// START SERVER
// ============================================================================
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 Server started successfully!                          ║
║   📡 Port: ${PORT}                                              ║
║   🗄️  Database: MongoDB                                    ║
║   ⏰ Time: ${new Date().toISOString()}                    ║
╚════════════════════════════════════════════════════════════╝

🔗 API Endpoints:
   └─ http://localhost:${PORT}/api

📚 Available Routes:
   ├─ POST   /api/otp/send              - Send OTP (Mock)
   ├─ POST   /api/otp/verify            - Verify OTP
   ├─ POST   /api/otp/clear             - Clear OTP
   ├─ POST   /api/auth/register         - Register Client
   ├─ POST   /api/auth/login            - Login Client
   ├─ POST   /api/auth/logout           - Logout Client
   ├─ GET    /api/auth/client/:id       - Get Client Details
   ├─ POST   /api/business/item-groups  - Create Item Group
   ├─ GET    /api/business/item-groups/:id - Get Item Groups
   ├─ POST   /api/business/items        - Create Item
   ├─ GET    /api/business/items/:id    - Get Items
   ├─ POST   /api/business/customers    - Get/Create Customer
   ├─ POST   /api/business/carts        - Create Cart
   ├─ POST   /api/business/carts/add-item - Add to Cart
   ├─ POST   /api/business/invoices/generate - Generate Invoice
   ├─ POST   /api/business/invoices/incomplete-sale - Create Incomplete Sale
   └─ GET    /api/health                - Health Check

✅ System is ready to handle requests!
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;

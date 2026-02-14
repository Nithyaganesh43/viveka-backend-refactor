import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { connectDB } from './src/config/db.js';

// Import routes
import otpRoutes from './src/apis/otp/route.js';
import mockOtpRouter from './src/apis/mockOtp/route.js';
import authRoutes from './src/apis/auth/route.js';
import clientRoutes from './src/apis/client/route.js';
import businessRoutes from './src/apis/business/route.js';
import dashboardRoutes from './src/apis/dashboard/route.js';
import syncRoutes from './src/apis/sync/route.js';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// Compression middleware
app.use(compression());

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173','https://viveha-ai.vercel.app'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTES
// ============================================================================

// OTP Routes
// app.use('/api/otp', otpRoutes);

// Mock OTP Routes (development/testing only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/mockotp', mockOtpRouter);
}
app.use('/api/otp', mockOtpRouter);

// Auth Routes
app.use('/api/auth', authRoutes);

// Client Routes (profile management)
app.use('/api/client', clientRoutes);

// Backward-compatible client routes under auth
app.use('/api/auth/client', clientRoutes);

// Business Routes (Items, Carts, Invoices, etc.)
app.use('/api/business', businessRoutes);

// Dashboard Routes (summary, trends, top items)
app.use('/api/dashboard', dashboardRoutes);

// Sync Routes (Offline sync)
app.use('/api', syncRoutes);
 

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
║   📡 Port: ${PORT}                                          ║
║   🗄️  Database: MongoDB                                     ║
║   ⏰ Time: ${new Date().toISOString()}                     ║
╚════════════════════════════════════════════════════════════╝

🔗 API Endpoints:
   └─ http://localhost:${PORT}/api
 

System is ready to handle requests!
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

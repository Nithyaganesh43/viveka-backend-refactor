import "dotenv/config";
import express, { Application, Request, Response, NextFunction } from "express";
import cors, { CorsOptionsDelegate } from "cors";
import helmet from "helmet";
import compression from "compression";
import { connectDB } from "./src/config/db"; 
// Routes
import otpRoutes from "./src/apis/otp/route";
import mockOtpRouter from "./src/apis/mockOtp/route";
import authRoutes from "./src/apis/auth/route";
import clientRoutes from "./src/apis/client/route";
import businessRoutes from "./src/apis/business/route";
import dashboardRoutes from "./src/apis/dashboard/route";
import syncRoutes from "./src/apis/sync/route";

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 10000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(compression());

// CORS setup
const allowedOrigins: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5173", "https://viveha-ai.vercel.app"];

const corsOptions: CorsOptionsDelegate<Request> = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Not allowed by CORS"));
};

app.use(cors({ origin: corsOptions, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTES
// ============================================================================

if (process.env.NODE_ENV !== "production") {
  app.use("/api/mockotp", mockOtpRouter);
}

app.use("/api/otp", otpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/auth/client", clientRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", syncRoutes);

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error:", err);

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : undefined,
    });
  }
);

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 Server started successfully!                          ║
║   📡 Port: ${PORT}                                          ║
║   🗄️  Database: MongoDB                                     ║
║   ⏰ Time: ${new Date().toISOString()}                     ║
╚════════════════════════════════════════════════════════════╝

🔗 API: http://localhost:${PORT}/api
`);
    });
  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;

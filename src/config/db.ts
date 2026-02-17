import mongoose, { Connection } from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export const connectDB = async (
  retryCount = 0
): Promise<Connection | void> => {
  try {
    const baseUrl = process.env.MONGO_URL;

    if (!baseUrl) {
      throw new Error("MONGO_URL is not defined in .env");
    }

    const dbName = process.env.MONGO_DB_NAME || "vivekaDB";
    let mongoUrl: string;

    try {
      const url = new URL(baseUrl);
      const hasDbPath = url.pathname && url.pathname !== "/";

      if (!hasDbPath) {
        url.pathname = `/${dbName}`;
      }

      url.searchParams.set("retryWrites", "false");

      mongoUrl = url.toString().replace(/\/$/, "");
    } catch (parseError: any) {
      throw new Error(`Invalid MONGO_URL: ${parseError.message}`);
    }

    await mongoose.connect(mongoUrl);

    console.log("✅ MongoDB connected successfully");

    mongoose.connection.on("disconnected", () => {
      console.error("⚠️ MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("error", (err: Error) => {
      console.error("❌ MongoDB connection error:", err.message);
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });

    return mongoose.connection;
  } catch (error: any) {
    console.error(
      `❌ MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
      error.message
    );

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);

      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAY_MS)
      );

      return connectDB(retryCount + 1);
    }

    console.error("❌ Max retries reached. Could not connect to MongoDB.");
    process.exit(1);
  }
};

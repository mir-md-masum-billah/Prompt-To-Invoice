import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

const onVercel = Boolean(process.env.VERCEL);
let connecting = null;

// Safe to call many times: re-uses one connection (important on serverless hosts).
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose
      .connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
      .then(() => {
        console.log("DB CONNECTED");
        return mongoose.connection;
      })
      .catch((err) => {
        connecting = null; // allow a retry on the next request
        console.error("DB connection failed:", err.message);
        if (!onVercel) process.exit(1); // locally: fail fast. Serverless: keep the function alive
        throw err;
      });
  }
  return connecting;
};

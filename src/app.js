import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

dotenv.config();

function normalizeOrigin(origin) {
  const value = String(origin || "").trim();

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

function expandOriginVariants(origin) {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return [];
  }

  const variants = new Set([normalizedOrigin]);

  try {
    const url = new URL(normalizedOrigin);
    const isLocalOrigin = ["localhost", "127.0.0.1"].includes(url.hostname);
    const port = url.port ? `:${url.port}` : "";

    if (!isLocalOrigin && url.hostname.startsWith("www.")) {
      variants.add(`${url.protocol}//${url.hostname.slice(4)}${port}`);
    }

    if (!isLocalOrigin && !url.hostname.startsWith("www.")) {
      variants.add(`${url.protocol}//www.${url.hostname}${port}`);
    }
  } catch {
    return [...variants];
  }

  return [...variants];
}

function parseConfiguredOrigins(value) {
  return String(value || "")
    .split(",")
    .flatMap((origin) => expandOriginVariants(origin))
    .filter(Boolean);
}

function getAllowedOrigins() {
  const origins = new Set([
    ...parseConfiguredOrigins(process.env.CLIENT_URL),
    ...parseConfiguredOrigins(process.env.CLIENT_URLS),
  ]);

  if (process.env.NODE_ENV !== "production") {
    [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ].forEach((origin) => origins.add(origin));
  }

  return [...origins];
}

const app = express();
const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Typing Clothing API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

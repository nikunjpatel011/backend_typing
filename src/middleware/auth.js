import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.replace("Bearer ", "").trim();
}

function createProtectMiddleware(expectedRole) {
  return asyncHandler(async (req, _res, next) => {
    const token = getBearerToken(req);

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new AppError("JWT secret is not configured", 500);
    }

    let decoded;

    try {
      decoded = jwt.verify(token, secret);
    } catch (_error) {
      throw new AppError("Invalid or expired token", 401);
    }

    if (decoded.role !== expectedRole) {
      throw new AppError("You are not authorized to access this resource", 403);
    }

    if (expectedRole === "admin") {
      const admin = await Admin.findById(decoded.sub);

      if (!admin) {
        throw new AppError("Admin account not found", 401);
      }

      req.admin = admin;
      return next();
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      throw new AppError("User account not found", 401);
    }

    req.user = user;
    return next();
  });
}

export const protectUser = createProtectMiddleware("user");
export const protectAdmin = createProtectMiddleware("admin");

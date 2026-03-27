import { Admin } from "../models/Admin.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createAuthResponse } from "../utils/tokens.js";

function sanitizeAdmin(admin) {
  const data = admin.toJSON();
  delete data.password;
  return data;
}

export const loginAdmin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const normalizedIdentifier = String(identifier).trim().toLowerCase();
  const admin = await Admin.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  }).select("+password");

  if (!admin || !(await admin.comparePassword(password))) {
    throw new AppError("Invalid admin credentials", 401);
  }

  res.json({
    success: true,
    message: "Admin login successful",
    data: createAuthResponse({
      user: sanitizeAdmin(admin),
      role: "admin",
    }),
  });
});

export const getAdminProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: sanitizeAdmin(req.admin),
  });
});

export const updateAdminProfile = asyncHandler(async (req, res) => {
  const { name, password } = req.body;

  if (typeof name === "string" && name.trim()) {
    req.admin.name = name.trim();
  }

  if (password) {
    req.admin.password = password;
  }

  await req.admin.save();

  res.json({
    success: true,
    message: "Admin profile updated successfully",
    data: sanitizeAdmin(req.admin),
  });
});

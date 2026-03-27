import { Cart } from "../models/Cart.js";
import { User } from "../models/User.js";
import { Wishlist } from "../models/Wishlist.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createAuthResponse } from "../utils/tokens.js";

function sanitizeDocument(document) {
  const data = document.toJSON();
  delete data.password;
  return data;
}

async function ensureUserResources(userId) {
  await Promise.all([
    Cart.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, items: [] } },
      { new: true, upsert: true },
    ),
    Wishlist.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, products: [] } },
      { new: true, upsert: true },
    ),
  ]);
}

export const registerUser = asyncHandler(async (req, res) => {
  const { name, contactNumber, pinCode, password } = req.body;

  const existingUser = await User.findOne({ contactNumber });

  if (existingUser) {
    throw new AppError("An account with this contact number already exists", 409);
  }

  const user = await User.create({
    name,
    contactNumber,
    pinCode,
    password,
  });

  await ensureUserResources(user.id);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: createAuthResponse({
      user: sanitizeDocument(user),
      role: "user",
    }),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { contactNumber, password } = req.body;

  const user = await User.findOne({ contactNumber }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid contact number or password", 401);
  }

  await ensureUserResources(user.id);

  res.json({
    success: true,
    message: "Login successful",
    data: createAuthResponse({
      user: sanitizeDocument(user),
      role: "user",
    }),
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: sanitizeDocument(req.user),
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, contactNumber, pinCode, password, profileImage } = req.body;
  const user = req.user;

  if (contactNumber && contactNumber !== user.contactNumber) {
    const existingContactUser = await User.findOne({ contactNumber });

    if (existingContactUser) {
      throw new AppError("This contact number is already in use", 409);
    }

    user.contactNumber = contactNumber;
  }

  if (typeof name === "string") {
    user.name = name;
  }

  if (typeof pinCode === "string") {
    user.pinCode = pinCode;
  }

  if (typeof profileImage !== "undefined") {
    user.profileImage = profileImage || null;
  }

  if (password) {
    user.password = password;
  }

  await user.save();

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: sanitizeDocument(user),
  });
});

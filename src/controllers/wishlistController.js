import { Product } from "../models/Product.js";
import { Wishlist } from "../models/Wishlist.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function getOrCreateWishlist(userId) {
  return Wishlist.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, products: [] } },
    { new: true, upsert: true },
  );
}

async function populateWishlist(wishlistId) {
  return Wishlist.findById(wishlistId).populate("products");
}

function serializeWishlist(wishlistDocument) {
  return {
    id: wishlistDocument.id,
    items: wishlistDocument.products.map((product) =>
      typeof product.toJSON === "function" ? product.toJSON() : product,
    ),
  };
}

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user.id);
  const populatedWishlist = await populateWishlist(wishlist.id);

  res.json({
    success: true,
    data: serializeWishlist(populatedWishlist),
  });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const wishlist = await getOrCreateWishlist(req.user.id);
  const alreadyExists = wishlist.products.some(
    (productId) => productId.toString() === product.id,
  );

  if (!alreadyExists) {
    wishlist.products.push(product.id);
    await wishlist.save();
  }

  const populatedWishlist = await populateWishlist(wishlist.id);

  res.status(201).json({
    success: true,
    message: alreadyExists
      ? "Product already exists in wishlist"
      : "Product added to wishlist",
    data: serializeWishlist(populatedWishlist),
  });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user.id);
  const nextProducts = wishlist.products.filter(
    (productId) => productId.toString() !== req.params.productId,
  );

  if (nextProducts.length === wishlist.products.length) {
    throw new AppError("Wishlist item not found", 404);
  }

  wishlist.products = nextProducts;
  await wishlist.save();

  const populatedWishlist = await populateWishlist(wishlist.id);

  res.json({
    success: true,
    message: "Product removed from wishlist",
    data: serializeWishlist(populatedWishlist),
  });
});

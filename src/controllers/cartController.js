import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateOrderTotals } from "../utils/orderPricing.js";

async function getOrCreateCart(userId) {
  return Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { new: true, upsert: true },
  );
}

async function populateCart(cartId) {
  return Cart.findById(cartId).populate("items.product");
}

function serializeCart(cartDocument) {
  const items = cartDocument.items
    .filter((item) => item.product)
    .map((item) => {
      const product =
        typeof item.product.toJSON === "function"
          ? item.product.toJSON()
          : item.product;

      return {
        id: item.id,
        product,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        lineTotal: product.price * item.quantity,
      };
    });
  const totals = calculateOrderTotals(
    items.map((item) => ({
      price: item.product.price,
      quantity: item.quantity,
    })),
  );

  return {
    id: cartDocument.id,
    items,
    ...totals,
  };
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const populatedCart = await populateCart(cart.id);

  res.json({
    success: true,
    data: serializeCart(populatedCart),
  });
});

export const addCartItem = asyncHandler(async (req, res) => {
  const { productId, size, color, quantity = 1 } = req.body;
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.stock < quantity) {
    throw new AppError("Requested quantity is not available in stock", 400);
  }

  const cart = await getOrCreateCart(req.user.id);
  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === product.id &&
      item.size === size &&
      item.color === color,
  );

  if (existingItem) {
    const nextQuantity = existingItem.quantity + Number(quantity);

    if (nextQuantity > product.stock) {
      throw new AppError("Requested quantity is not available in stock", 400);
    }

    existingItem.quantity = nextQuantity;
  } else {
    cart.items.push({
      product: product.id,
      size,
      color,
      quantity: Number(quantity),
    });
  }

  await cart.save();
  const populatedCart = await populateCart(cart.id);

  res.status(201).json({
    success: true,
    message: "Cart updated successfully",
    data: serializeCart(populatedCart),
  });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await getOrCreateCart(req.user.id);
  const item = cart.items.id(req.params.itemId);

  if (!item) {
    throw new AppError("Cart item not found", 404);
  }

  const product = await Product.findById(item.product);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (Number(quantity) > product.stock) {
    throw new AppError("Requested quantity is not available in stock", 400);
  }

  item.quantity = Number(quantity);
  await cart.save();

  const populatedCart = await populateCart(cart.id);

  res.json({
    success: true,
    message: "Cart item updated successfully",
    data: serializeCart(populatedCart),
  });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const item = cart.items.id(req.params.itemId);

  if (!item) {
    throw new AppError("Cart item not found", 404);
  }

  item.deleteOne();
  await cart.save();
  const populatedCart = await populateCart(cart.id);

  res.json({
    success: true,
    message: "Cart item removed successfully",
    data: serializeCart(populatedCart),
  });
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  cart.items = [];
  await cart.save();

  res.json({
    success: true,
    message: "Cart cleared successfully",
    data: serializeCart(cart),
  });
});

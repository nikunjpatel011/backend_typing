import { Cart } from "../models/Cart.js";
import { RETURN_WINDOW_DAYS } from "../constants/order.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ensureOrderCustomerCompatibility } from "../utils/orderCustomerCompatibility.js";
import { calculateOrderTotals } from "../utils/orderPricing.js";

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const randomChunk = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}${randomChunk}`;
}

function serializeOrder(order) {
  return typeof order.toJSON === "function" ? order.toJSON() : order;
}

function getReturnWindowEnd(deliveredAt) {
  if (!deliveredAt) {
    return null;
  }

  return new Date(
    new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
}

function assertReturnEligibility(order) {
  if (order.status !== "delivered") {
    throw new AppError("Return is available only after delivery", 400);
  }

  if (order.returnRequest?.status && order.returnRequest.status !== "none") {
    throw new AppError("A return request already exists for this order", 400);
  }

  const deliveredAt = order.deliveredAt || order.updatedAt;
  const returnWindowEnd = getReturnWindowEnd(deliveredAt);

  if (!returnWindowEnd || returnWindowEnd.getTime() < Date.now()) {
    throw new AppError(
      `Return window closed after ${RETURN_WINDOW_DAYS} days from delivery`,
      400,
    );
  }
}

export const createOrder = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty", 400);
  }

  const normalizedItems = cart.items.map((item) => {
    const product = item.product;

    if (!product) {
      throw new AppError("One or more cart products no longer exist", 400);
    }

    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    return {
      product: product.id,
      name: product.name,
      brand: product.brand,
      image: product.images[0] || "",
      price: product.price,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
    };
  });
  const totals = calculateOrderTotals(normalizedItems);
  const customer = {
    name: req.body.name || req.body.fullName || req.user.name,
    contactNumber:
      req.body.contactNumber || req.body.phoneNumber || req.user.contactNumber,
    pinCode: req.body.pinCode || req.body.zipCode || req.user.pinCode,
    fullName: req.body.fullName || req.body.name || req.user.name,
    fullAddress: req.body.fullAddress,
    city: req.body.city,
    state: req.body.state,
    zipCode: req.body.zipCode || req.body.pinCode || req.user.pinCode,
    country: req.body.country,
    phoneNumber:
      req.body.phoneNumber || req.body.contactNumber || req.user.contactNumber,
  };

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: req.user.id,
    customer,
    items: normalizedItems,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    tax: totals.tax,
    total: totals.total,
    paymentMethod: req.body.paymentMethod || "cod",
    notes: req.body.notes || "",
  });

  await Promise.all(
    normalizedItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      }),
    ),
  );

  cart.items = [];
  await cart.save();

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: serializeOrder(order),
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: orders.map(serializeOrder),
  });
});

export const getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user.id,
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  res.json({
    success: true,
    data: serializeOrder(order),
  });
});

export const requestOrderReturn = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user.id,
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  assertReturnEligibility(order);
  ensureOrderCustomerCompatibility(order);

  order.returnRequest = {
    status: "requested",
    reason: req.body.reason.trim(),
    requestedAt: new Date(),
    processedAt: null,
    adminNotes: "",
  };
  await order.save();

  res.json({
    success: true,
    message: "Return request submitted successfully",
    data: serializeOrder(order),
  });
});

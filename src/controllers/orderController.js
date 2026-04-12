import { Cart } from "../models/Cart.js";
import { REPLACEMENT_REASONS } from "../constants/order.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ensureOrderCustomerCompatibility } from "../utils/orderCustomerCompatibility.js";
import { calculateOrderTotals } from "../utils/orderPricing.js";
import {
  amountToPaise,
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  verifyRazorpaySignature,
} from "../utils/razorpay.js";
import { attachReviewsToOrder } from "../utils/reviews.js";
import { restoreOrderItemsStock } from "../utils/orderStock.js";
import { serializeOrderRecord } from "../utils/serializeOrder.js";

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const randomChunk = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}${randomChunk}`;
}

function generateRazorpayReceipt() {
  const timestamp = Date.now().toString().slice(-10);
  const randomChunk = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `tc${timestamp}${randomChunk}`;
}

const CUSTOMER_ORDER_CANCELLATION_WINDOW_HOURS = 12;
const CUSTOMER_ORDER_CANCELLATION_WINDOW_MS =
  CUSTOMER_ORDER_CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

function assertReplacementEligibility(order) {
  if (order.status !== "delivered") {
    throw new AppError("Replacement is available only after delivery", 400);
  }

  if (order.returnRequest?.status && order.returnRequest.status !== "none") {
    throw new AppError("A replacement request already exists for this order", 400);
  }
}

function hasCustomerCancellationWindowExpired(order) {
  const createdAtTimestamp = new Date(order.createdAt).getTime();

  if (!Number.isFinite(createdAtTimestamp)) {
    return true;
  }

  return Date.now() - createdAtTimestamp > CUSTOMER_ORDER_CANCELLATION_WINDOW_MS;
}

function getCustomerCancellationErrorMessage(order) {
  switch (order.status) {
    case "pending":
    case "confirmed":
      return `Orders can only be cancelled within ${CUSTOMER_ORDER_CANCELLATION_WINDOW_HOURS} hours of being placed`;
    case "shipped":
      return "Your order has already been shipped and can no longer be cancelled";
    case "delivered":
      return "Your order has already been delivered and can no longer be cancelled";
    case "cancelled":
      return "This order is already cancelled";
    default:
      return "This order can no longer be cancelled";
  }
}

function assertCustomerCanCancelOrder(order) {
  if (order.status === "shipped" || order.status === "delivered" || order.status === "cancelled") {
    throw new AppError(getCustomerCancellationErrorMessage(order), 400);
  }

  if (order.status === "pending" || order.status === "confirmed") {
    if (!hasCustomerCancellationWindowExpired(order)) {
      return;
    }

    throw new AppError(getCustomerCancellationErrorMessage(order), 400);
  }

  throw new AppError("This order can no longer be cancelled", 400);
}

async function getCartWithProducts(userId) {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty", 400);
  }

  return cart;
}

function getNormalizedCartItems(cart) {
  return cart.items.map((item) => {
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
}

function buildCustomer(user, body) {
  return {
    name: String(body.name || body.fullName || user.name || "").trim(),
    contactNumber: String(
      body.contactNumber || body.phoneNumber || user.contactNumber || "",
    ).trim(),
    pinCode: String(body.pinCode || body.zipCode || user.pinCode || "").trim(),
    fullName: String(body.fullName || body.name || user.name || "").trim(),
    fullAddress: String(body.fullAddress || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    zipCode: String(body.zipCode || body.pinCode || user.pinCode || "").trim(),
    country: String(body.country || "").trim(),
    phoneNumber: String(
      body.phoneNumber || body.contactNumber || user.contactNumber || "",
    ).trim(),
  };
}

async function persistPaidOrder({
  user,
  cart,
  customer,
  items,
  totals,
  notes,
  payment,
}) {
  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: user.id,
    customer,
    items,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    tax: totals.tax,
    total: totals.total,
    paymentMethod: "razorpay",
    payment,
    notes,
  });

  await Promise.all(
    items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      }),
    ),
  );

  cart.items = [];
  await cart.save();

  return order;
}

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const cart = await getCartWithProducts(req.user.id);
  const normalizedItems = getNormalizedCartItems(cart);
  const totals = calculateOrderTotals(normalizedItems);
  const customer = buildCustomer(req.user, req.body);
  const orderReference = generateOrderNumber();
  const razorpayOrder = await createRazorpayOrder({
    amount: amountToPaise(totals.total),
    currency: "INR",
    receipt: generateRazorpayReceipt(),
    notes: {
      order_reference: orderReference,
      customer_name: customer.fullName.slice(0, 40),
      customer_phone: customer.phoneNumber.slice(0, 15),
    },
  });

  res.status(201).json({
    success: true,
    message: "Checkout session created successfully",
    data: {
      keyId: getRazorpayKeyId(),
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderReference,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
    },
  });
});

export const verifyOrderPayment = asyncHandler(async (req, res) => {
  const existingOrder = await Order.findOne({
    "payment.razorpayPaymentId": req.body.razorpayPaymentId,
    user: req.user.id,
  });

  if (existingOrder) {
    res.json({
      success: true,
      message: "Order payment already verified",
      data: serializeOrderRecord(existingOrder),
    });
    return;
  }

  if (
    !verifyRazorpaySignature({
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
    })
  ) {
    throw new AppError("Razorpay payment signature is invalid", 400);
  }

  const cart = await getCartWithProducts(req.user.id);
  const normalizedItems = getNormalizedCartItems(cart);
  const totals = calculateOrderTotals(normalizedItems);
  const expectedAmountInPaise = amountToPaise(totals.total);

  let paymentDetails = await fetchRazorpayPayment(req.body.razorpayPaymentId);

  if (paymentDetails.order_id !== req.body.razorpayOrderId) {
    throw new AppError("Razorpay payment does not belong to this checkout session", 400);
  }

  if (Number(paymentDetails.amount) !== expectedAmountInPaise) {
    throw new AppError("Paid amount does not match the current cart total", 400);
  }

  if (paymentDetails.status === "authorized") {
    paymentDetails = await captureRazorpayPayment(
      req.body.razorpayPaymentId,
      expectedAmountInPaise,
      paymentDetails.currency || "INR",
    );
  }

  if (paymentDetails.status !== "captured") {
    throw new AppError("Payment was not captured successfully", 400, {
      razorpayStatus: paymentDetails.status,
    });
  }

  const customer = buildCustomer(req.user, req.body);
  const order = await persistPaidOrder({
    user: req.user,
    cart,
    customer,
    items: normalizedItems,
    totals,
    notes: String(req.body.notes || "").trim(),
    payment: {
      provider: "razorpay",
      status: "paid",
      currency: String(paymentDetails.currency || "INR").toUpperCase(),
      amount: totals.total,
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
      paidAt: paymentDetails.captured_at
        ? new Date(Number(paymentDetails.captured_at) * 1000)
        : new Date(),
      verifiedAt: new Date(),
    },
  });

  res.status(201).json({
    success: true,
    message: "Order payment verified successfully",
    data: serializeOrderRecord(order),
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: orders.map(serializeOrderRecord),
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

  const hydratedOrder = await attachReviewsToOrder(order, req.user.id);

  res.json({
    success: true,
    data: serializeOrderRecord(hydratedOrder),
  });
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user.id,
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  ensureOrderCustomerCompatibility(order);
  assertCustomerCanCancelOrder(order);
  await restoreOrderItemsStock(order);
  order.status = "cancelled";
  order.deliveredAt = null;
  await order.save();

  res.json({
    success: true,
    message: "Order cancelled successfully",
    data: serializeOrderRecord(order),
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

  assertReplacementEligibility(order);
  ensureOrderCustomerCompatibility(order);

  if (!REPLACEMENT_REASONS.includes(req.body.reason)) {
    throw new AppError("Replacement reason is invalid", 400);
  }

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
    message: "Replacement request submitted successfully",
    data: serializeOrderRecord(order),
  });
});

export const markMyOrderWhatsappShared = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user.id,
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (!order.whatsappSharedAt) {
    order.whatsappSharedAt = new Date();
    await order.save();
  }

  res.json({
    success: true,
    message: "Order WhatsApp share recorded successfully",
    data: serializeOrderRecord(order),
  });
});

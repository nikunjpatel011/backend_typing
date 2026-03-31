import { Order } from "../models/Order.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ensureOrderCustomerCompatibility } from "../utils/orderCustomerCompatibility.js";
import {
  assertOrderItemsInStock,
  reserveOrderItemsStock,
  restoreOrderItemsStock,
} from "../utils/orderStock.js";

async function adjustStockForStatusChange(order, nextStatus) {
  if (order.status === nextStatus) {
    return;
  }

  if (nextStatus === "cancelled" && order.status !== "cancelled") {
    await restoreOrderItemsStock(order);
    return;
  }

  if (order.status === "cancelled" && nextStatus !== "cancelled") {
    await assertOrderItemsInStock(
      order,
      (item) => `Cannot move order out of cancelled because ${item.name} is out of stock`,
    );
    await reserveOrderItemsStock(order);
  }
}

async function adjustStockForReturnChange(order, nextStatus) {
  const currentStatus = order.returnRequest?.status || "none";

  if (currentStatus === nextStatus) {
    return;
  }

  if (nextStatus === "received" && currentStatus !== "received") {
    await restoreOrderItemsStock(order);
    return;
  }

  if (currentStatus === "received" && nextStatus !== "received") {
    await assertOrderItemsInStock(
      order,
      (item) => `Cannot reopen return because ${item.name} is out of stock`,
    );
    await reserveOrderItemsStock(order);
  }
}

export const getAdminOrders = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.returnStatus) {
    query["returnRequest.status"] = req.query.returnStatus;
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: orders.map((order) => order.toJSON()),
  });
});

export const getAdminOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  res.json({
    success: true,
    data: order.toJSON(),
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const nextStatus = req.body.status;
  const previousStatus = order.status;
  await adjustStockForStatusChange(order, nextStatus);
  ensureOrderCustomerCompatibility(order);
  order.status = nextStatus;

  if (nextStatus === "delivered") {
    order.deliveredAt = order.deliveredAt || new Date();
  } else if (previousStatus === "delivered") {
    order.deliveredAt = null;
  }

  await order.save();

  res.json({
    success: true,
    message: "Order status updated successfully",
    data: order.toJSON(),
  });
});

export const updateReturnStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.status !== "delivered") {
    throw new AppError("Return updates are available only for delivered orders", 400);
  }

  const currentStatus = order.returnRequest?.status || "none";
  const nextStatus = req.body.status;

  if (currentStatus === "none" && nextStatus !== "none") {
    throw new AppError("No return request exists for this order", 400);
  }

  await adjustStockForReturnChange(order, nextStatus);
  ensureOrderCustomerCompatibility(order);

  if (nextStatus === "none") {
    order.returnRequest = {
      status: "none",
      reason: "",
      requestedAt: null,
      processedAt: null,
      adminNotes: "",
    };
  } else {
    order.returnRequest.status = nextStatus;
    order.returnRequest.adminNotes = req.body.adminNotes?.trim() || "";

    if (!order.returnRequest.requestedAt) {
      order.returnRequest.requestedAt = new Date();
    }

    order.returnRequest.processedAt =
      nextStatus === "received" || nextStatus === "rejected" ? new Date() : null;
  }

  await order.save();

  res.json({
    success: true,
    message: "Return status updated successfully",
    data: order.toJSON(),
  });
});

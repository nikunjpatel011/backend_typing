import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function adjustStockForStatusChange(order, nextStatus) {
  if (order.status === nextStatus) {
    return;
  }

  if (nextStatus === "cancelled" && order.status !== "cancelled") {
    await Promise.all(
      order.items.map((item) =>
        Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        }),
      ),
    );
    return;
  }

  if (order.status === "cancelled" && nextStatus !== "cancelled") {
    for (const item of order.items) {
      const product = await Product.findById(item.product);

      if (!product || product.stock < item.quantity) {
        throw new AppError(
          `Cannot move order out of cancelled because ${item.name} is out of stock`,
          400,
        );
      }
    }

    await Promise.all(
      order.items.map((item) =>
        Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        }),
      ),
    );
  }
}

export const getAdminOrders = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.status) {
    query.status = req.query.status;
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
  await adjustStockForStatusChange(order, nextStatus);
  order.status = nextStatus;
  await order.save();

  res.json({
    success: true,
    message: "Order status updated successfully",
    data: order.toJSON(),
  });
});

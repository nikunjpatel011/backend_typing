import { Product } from "../models/Product.js";
import { AppError } from "./appError.js";

export async function restoreOrderItemsStock(order) {
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      }),
    ),
  );
}

export async function reserveOrderItemsStock(order) {
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      }),
    ),
  );
}

export async function assertOrderItemsInStock(order, buildMessage) {
  for (const item of order.items) {
    const product = await Product.findById(item.product).select("stock");

    if (!product || product.stock < item.quantity) {
      throw new AppError(buildMessage(item), 400);
    }
  }
}

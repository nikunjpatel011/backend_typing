import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeReview, syncProductReviewStats } from "../utils/reviews.js";

function findOrderItem(order, productId, orderItemId) {
  if (orderItemId) {
    const matchedItem = order.items.find((item) => String(item.id || item._id) === String(orderItemId));

    if (!matchedItem) {
      return null;
    }

    if (String(matchedItem.product) !== String(productId)) {
      throw new AppError("Selected order item does not match this product", 400);
    }

    return matchedItem;
  }

  const matchingItems = order.items.filter((item) => String(item.product) === String(productId));

  if (matchingItems.length === 1) {
    return matchingItems[0];
  }

  return null;
}

export const createOrderReview = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user.id,
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.status !== "delivered") {
    throw new AppError("Reviews can only be submitted after delivery", 400);
  }

  const { orderItemId, productId, rating } = req.body;

  const orderItem = findOrderItem(order, productId, orderItemId);

  if (!orderItem) {
    throw new AppError("This order item could not be reviewed", 400);
  }

  const [product, existingReview] = await Promise.all([
    Product.findById(productId),
    Review.findOne({
      order: order.id,
      orderItem: orderItem.id || orderItem._id,
      user: req.user.id,
    }),
  ]);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (existingReview) {
    throw new AppError(
      "You have already submitted a review for this product in this order",
      409,
    );
  }

  const review = await Review.create({
    product: product.id,
    order: order.id,
    orderItem: orderItem.id || orderItem._id,
    user: req.user.id,
    orderNumber: order.orderNumber,
    userName: req.user.name,
    productName: orderItem.name,
    productImage: orderItem.image || product.images[0] || "",
    rating: Number(rating),
    reviewText: "",
    images: [],
    imagePublicIds: [],
    status: "approved",
    approvedAt: new Date(),
  });

  await syncProductReviewStats(product.id);

  res.status(201).json({
    success: true,
    message: "Rating submitted successfully",
    data: serializeReview(review),
  });
});

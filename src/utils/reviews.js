import { Buffer } from "node:buffer";
import { MAX_REVIEW_IMAGE_SIZE_BYTES } from "../constants/review.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { AppError } from "./appError.js";

const IMAGE_DATA_URI_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/;

export function serializeReview(review) {
  return typeof review?.toJSON === "function" ? review.toJSON() : review;
}

export async function getApprovedProductReviews(productId) {
  const reviews = await Review.find({
    product: productId,
  }).sort({ createdAt: -1 });

  return reviews.map(serializeReview);
}

export async function getOrderReviews(orderId, userId) {
  const reviews = await Review.find({
    order: orderId,
    user: userId,
  }).sort({ createdAt: -1 });

  return reviews.map(serializeReview);
}

export async function attachReviewsToOrder(order, userId) {
  const serializedOrder = typeof order?.toJSON === "function" ? order.toJSON() : order;

  return {
    ...serializedOrder,
    reviews: await getOrderReviews(serializedOrder.id, userId),
  };
}

export function assertReviewImagesWithinLimit(images) {
  if (!Array.isArray(images)) {
    return;
  }

  images.forEach((image, index) => {
    if (typeof image !== "string") {
      throw new AppError(`Review image ${index + 1} is invalid`, 400);
    }

    const match = image.match(IMAGE_DATA_URI_PATTERN);

    if (!match) {
      throw new AppError(`Review image ${index + 1} must be a valid image`, 400);
    }

    const byteSize = Buffer.from(match[1], "base64").length;

    if (byteSize > MAX_REVIEW_IMAGE_SIZE_BYTES) {
      throw new AppError(
        `Review image ${index + 1} must be 1 MB or smaller`,
        400,
      );
    }
  });
}

export function getReviewUploadFolder() {
  return process.env.CLOUDINARY_REVIEW_FOLDER?.trim() || "typing-clothing/reviews";
}

export async function syncProductReviewStats(productId) {
  if (!productId) {
    return;
  }

  const allReviews = await Review.find({
    product: productId,
  }).select("rating");

  const reviewCount = allReviews.length;
  const rating =
    reviewCount > 0
      ? Number(
          (
            allReviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount
          ).toFixed(1),
        )
      : 0;

  await Product.findByIdAndUpdate(productId, {
    rating,
    reviewCount,
  });
}

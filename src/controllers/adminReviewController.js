import { Review } from "../models/Review.js";
import { deleteCloudinaryImages } from "../utils/cloudinary.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeReview, syncProductReviewStats } from "../utils/reviews.js";

export const getAdminReviews = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.status) {
    query.status = req.query.status;
  }

  const reviews = await Review.find(query).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: reviews.map(serializeReview),
  });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  const productId = review.product;

  await deleteCloudinaryImages(review.imagePublicIds || []);
  await review.deleteOne();
  await syncProductReviewStats(productId);

  res.json({
    success: true,
    message: "Review deleted successfully",
  });
});

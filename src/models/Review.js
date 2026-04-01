import mongoose from "mongoose";
import { REVIEW_STATUSES } from "../constants/review.js";
import { baseSchemaOptions } from "../utils/schemaOptions.js";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productImage: {
      type: String,
      default: "",
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    images: {
      type: [String],
      default: [],
    },
    imagePublicIds: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "pending",
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  baseSchemaOptions,
);

reviewSchema.index({ order: 1, orderItem: 1, user: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);

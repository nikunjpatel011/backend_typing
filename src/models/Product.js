import mongoose from "mongoose";
import { baseSchemaOptions } from "../utils/schemaOptions.js";

const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    hex: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: String,
      default: "",
      trim: true,
    },
    sizes: {
      type: [String],
      default: [],
    },
    colors: {
      type: [colorSchema],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    imagePublicIds: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    isNew: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    ...baseSchemaOptions,
    suppressReservedKeysWarning: true,
  },
);

productSchema.virtual("inStock").get(function inStock() {
  return this.stock > 0;
});

productSchema.virtual("stockCount").get(function stockCount() {
  return this.stock;
});

productSchema.virtual("discount").get(function discount() {
  if (!this.originalPrice || this.originalPrice <= this.price) {
    return 0;
  }

  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

export const Product = mongoose.model("Product", productSchema);

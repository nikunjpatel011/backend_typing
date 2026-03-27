import { Product } from "../models/Product.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteCloudinaryImages } from "../utils/cloudinary.js";

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeColors(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function arraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function buildProductPayload(body, existingProduct = null) {
  const nextImages = normalizeArray(body.images);
  const nextImagePublicIds = Array.isArray(body.imagePublicIds)
    ? normalizeArray(body.imagePublicIds)
    : existingProduct && arraysEqual(nextImages, existingProduct.images || [])
      ? existingProduct.imagePublicIds || []
      : [];

  return {
    name: body.name,
    brand: body.brand,
    description: body.description,
    price: Number(body.price),
    originalPrice: body.originalPrice ? Number(body.originalPrice) : null,
    category: body.category,
    subcategory: body.subcategory || "",
    sizes: normalizeArray(body.sizes),
    colors: normalizeColors(body.colors),
    images: nextImages,
    imagePublicIds: nextImagePublicIds,
    stock: Number(body.stock),
    tags: normalizeArray(body.tags),
    isNew: Boolean(body.isNew),
    isTrending: Boolean(body.isTrending),
    rating: body.rating ? Number(body.rating) : 0,
    reviewCount: body.reviewCount ? Number(body.reviewCount) : 0,
  };
}

export const getAdminProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    data: products.map((product) => product.toJSON()),
  });
});

export const getAdminProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  res.json({
    success: true,
    data: product.toJSON(),
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(buildProductPayload(req.body));

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product.toJSON(),
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const previousImagePublicIds = [...(product.imagePublicIds || [])];
  const payload = buildProductPayload(req.body, product);

  Object.assign(product, payload);
  await product.save();

  const nextImagePublicIds = new Set(product.imagePublicIds || []);
  const removedImagePublicIds = previousImagePublicIds.filter(
    (publicId) => !nextImagePublicIds.has(publicId),
  );

  await deleteCloudinaryImages(removedImagePublicIds);

  res.json({
    success: true,
    message: "Product updated successfully",
    data: product.toJSON(),
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  await deleteCloudinaryImages(product.imagePublicIds || []);
  await product.deleteOne();

  res.json({
    success: true,
    message: "Product deleted successfully",
  });
});

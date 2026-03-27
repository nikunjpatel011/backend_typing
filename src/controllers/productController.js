import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function normalizeCsv(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortProducts(products, sortBy) {
  const sortable = [...products];

  switch (sortBy) {
    case "newest":
      return sortable.sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      );
    case "price_low":
      return sortable.sort((first, second) => first.price - second.price);
    case "price_high":
      return sortable.sort((first, second) => second.price - first.price);
    case "rating":
      return sortable.sort((first, second) => second.rating - first.rating);
    case "discount":
      return sortable.sort((first, second) => second.discount - first.discount);
    case "popularity":
    default:
      return sortable.sort((first, second) => second.reviewCount - first.reviewCount);
  }
}

export const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort = "popularity",
    page = 1,
    limit = 24,
    isNew,
    isTrending,
    sale,
  } = req.query;

  const sizes = normalizeCsv(req.query.sizes);
  const colors = normalizeCsv(req.query.colors);
  const tags = normalizeCsv(req.query.tags);
  const query = {};

  if (category) {
    query.category = new RegExp(`^${category}$`, "i");
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (minPrice || maxPrice) {
    query.price = {};

    if (minPrice) {
      query.price.$gte = Number(minPrice);
    }

    if (maxPrice) {
      query.price.$lte = Number(maxPrice);
    }
  }

  if (sizes.length > 0) {
    query.sizes = { $in: sizes };
  }

  if (colors.length > 0) {
    query["colors.name"] = { $in: colors };
  }

  if (tags.length > 0) {
    query.tags = { $in: tags };
  }

  if (String(isNew) === "true") {
    query.isNew = true;
  }

  if (String(isTrending) === "true") {
    query.isTrending = true;
  }

  if (String(sale) === "true") {
    query.originalPrice = { $gt: 0 };
  }

  const products = await Product.find(query);
  const normalizedProducts = sortProducts(
    products
      .map((product) => product.toJSON())
      .filter((product) => (String(sale) === "true" ? product.discount > 0 : true)),
    sort,
  );

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const startIndex = (pageNumber - 1) * limitNumber;
  const paginatedProducts = normalizedProducts.slice(
    startIndex,
    startIndex + limitNumber,
  );

  res.json({
    success: true,
    data: paginatedProducts,
    meta: {
      total: normalizedProducts.length,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.max(1, Math.ceil(normalizedProducts.length / limitNumber)),
    },
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.json({
    success: true,
    data: product.toJSON(),
  });
});

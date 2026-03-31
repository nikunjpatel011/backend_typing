import { Router } from "express";
import { body, param } from "express-validator";
import {
  getAdminProfile,
  loginAdmin,
  updateAdminProfile,
} from "../controllers/adminAuthController.js";
import { getDashboardSummary } from "../controllers/adminDashboardController.js";
import {
  createProduct,
  deleteProduct,
  getAdminProductById,
  getAdminProducts,
  updateProduct,
} from "../controllers/adminProductController.js";
import { uploadProductImages } from "../controllers/adminUploadController.js";
import {
  getAdminOrderById,
  getAdminOrders,
  updateReturnStatus,
  updateOrderStatus,
} from "../controllers/adminOrderController.js";
import { getAdminUsers } from "../controllers/adminUserController.js";
import { ORDER_STATUSES, RETURN_STATUSES } from "../constants/order.js";
import { protectAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

const productValidators = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("brand").trim().notEmpty().withMessage("Brand is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("originalPrice")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("Original price must be a positive number"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("sizes").isArray({ min: 1 }).withMessage("At least one size is required"),
  body("colors").isArray({ min: 1 }).withMessage("At least one color is required"),
  body("images").isArray({ min: 1 }).withMessage("At least one image is required"),
  body("imagePublicIds").optional().isArray(),
  body("imagePublicIds.*").optional().isString(),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be 0 or higher"),
  body("tags").optional().isArray(),
  body("isNew").optional().isBoolean(),
  body("isTrending").optional().isBoolean(),
];

router.post(
  "/auth/login",
  [
    body("identifier").trim().notEmpty().withMessage("Email or username is required"),
    body("password")
      .trim()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters"),
  ],
  validateRequest,
  loginAdmin,
);

router.use(protectAdmin);

router.get("/dashboard", getDashboardSummary);
router.post(
  "/uploads/product-images",
  [
    body("images").isArray({ min: 1 }).withMessage("At least one image is required"),
    body("images.*")
      .isString()
      .custom((value) => value.startsWith("data:image/"))
      .withMessage("Each uploaded file must be an image"),
  ],
  validateRequest,
  uploadProductImages,
);
router.get("/profile", getAdminProfile);
router.put(
  "/profile",
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("password")
      .optional()
      .trim()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters"),
  ],
  validateRequest,
  updateAdminProfile,
);

router.get("/products", getAdminProducts);
router.get(
  "/products/:productId",
  [param("productId").isMongoId().withMessage("Invalid product id")],
  validateRequest,
  getAdminProductById,
);
router.post("/products", productValidators, validateRequest, createProduct);
router.put(
  "/products/:productId",
  [
    param("productId").isMongoId().withMessage("Invalid product id"),
    ...productValidators,
  ],
  validateRequest,
  updateProduct,
);
router.delete(
  "/products/:productId",
  [param("productId").isMongoId().withMessage("Invalid product id")],
  validateRequest,
  deleteProduct,
);

router.get("/orders", getAdminOrders);
router.get(
  "/orders/:orderId",
  [param("orderId").isMongoId().withMessage("Invalid order id")],
  validateRequest,
  getAdminOrderById,
);
router.patch(
  "/orders/:orderId/status",
  [
    param("orderId").isMongoId().withMessage("Invalid order id"),
    body("status")
      .isIn(ORDER_STATUSES)
      .withMessage(`Status must be one of: ${ORDER_STATUSES.join(", ")}`),
  ],
  validateRequest,
  updateOrderStatus,
);
router.patch(
  "/orders/:orderId/return",
  [
    param("orderId").isMongoId().withMessage("Invalid order id"),
    body("status")
      .isIn(RETURN_STATUSES)
      .withMessage(`Return status must be one of: ${RETURN_STATUSES.join(", ")}`),
    body("adminNotes").optional().isString(),
  ],
  validateRequest,
  updateReturnStatus,
);

router.get("/users", getAdminUsers);

export default router;

import { Router } from "express";
import { body, param } from "express-validator";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../controllers/cartController.js";
import { protectUser } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.use(protectUser);

router.get("/", getCart);
router.post(
  "/items",
  [
    body("productId").isMongoId().withMessage("Invalid product id"),
    body("size").trim().notEmpty().withMessage("Size is required"),
    body("color").trim().notEmpty().withMessage("Color is required"),
    body("quantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  validateRequest,
  addCartItem,
);
router.patch(
  "/items/:itemId",
  [
    param("itemId").isMongoId().withMessage("Invalid cart item id"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  validateRequest,
  updateCartItem,
);
router.delete(
  "/items/:itemId",
  [param("itemId").isMongoId().withMessage("Invalid cart item id")],
  validateRequest,
  removeCartItem,
);
router.delete("/", clearCart);

export default router;

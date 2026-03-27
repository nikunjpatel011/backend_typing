import { Router } from "express";
import { body, param } from "express-validator";
import {
  createOrder,
  getMyOrderById,
  getMyOrders,
} from "../controllers/orderController.js";
import { protectUser } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.use(protectUser);

router.get("/my", getMyOrders);
router.get(
  "/:orderId",
  [param("orderId").isMongoId().withMessage("Invalid order id")],
  validateRequest,
  getMyOrderById,
);
router.post(
  "/",
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("contactNumber")
      .optional()
      .trim()
      .matches(/^[0-9+\-\s()]{10,15}$/)
      .withMessage("Contact number must be 10 to 15 characters"),
    body("pinCode")
      .optional()
      .trim()
      .matches(/^[0-9]{6}$/)
      .withMessage("Pin code must be 6 digits"),
    body("paymentMethod").optional().trim().notEmpty(),
    body("notes").optional().isString(),
  ],
  validateRequest,
  createOrder,
);

export default router;

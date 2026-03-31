import { Router } from "express";
import { body, param } from "express-validator";
import {
  cancelMyOrder,
  createOrder,
  getMyOrderById,
  getMyOrders,
  requestOrderReturn,
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
router.patch(
  "/:orderId/cancel",
  [param("orderId").isMongoId().withMessage("Invalid order id")],
  validateRequest,
  cancelMyOrder,
);
router.post(
  "/:orderId/return-request",
  [
    param("orderId").isMongoId().withMessage("Invalid order id"),
    body("reason")
      .trim()
      .isLength({ min: 10, max: 400 })
      .withMessage("Return reason must be between 10 and 400 characters"),
  ],
  validateRequest,
  requestOrderReturn,
);
router.post(
  "/",
  [
    body("fullName")
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage("Full name must be between 2 and 80 characters"),
    body("fullAddress")
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage("Full address must be between 10 and 200 characters"),
    body("city")
      .trim()
      .matches(/^[A-Za-z][A-Za-z\s.'-]{1,49}$/)
      .withMessage("Enter a valid city"),
    body("state")
      .trim()
      .matches(/^[A-Za-z][A-Za-z\s.'-]{1,49}$/)
      .withMessage("Enter a valid state"),
    body("zipCode")
      .trim()
      .matches(/^[A-Za-z0-9\s-]{4,10}$/)
      .withMessage("ZIP code must be 4 to 10 letters or digits"),
    body("country")
      .trim()
      .matches(/^[A-Za-z][A-Za-z\s.'-]{1,49}$/)
      .withMessage("Enter a valid country"),
    body("phoneNumber")
      .trim()
      .matches(/^[0-9+\-\s()]{10,15}$/)
      .withMessage("Phone number must be 10 to 15 digits"),
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

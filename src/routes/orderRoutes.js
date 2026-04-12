import { Router } from "express";
import { body, param } from "express-validator";
import { REPLACEMENT_REASONS } from "../constants/order.js";
import {
  cancelMyOrder,
  createCheckoutSession,
  getMyOrderById,
  getMyOrders,
  markMyOrderWhatsappShared,
  requestOrderReturn,
  verifyOrderPayment,
} from "../controllers/orderController.js";
import { createOrderReview } from "../controllers/reviewController.js";
import { protectUser } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

const deliveryDetailValidators = [
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
  body("notes").optional().isString(),
];

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
router.patch(
  "/:orderId/whatsapp-shared",
  [param("orderId").isMongoId().withMessage("Invalid order id")],
  validateRequest,
  markMyOrderWhatsappShared,
);
router.post(
  "/:orderId/return-request",
  [
    param("orderId").isMongoId().withMessage("Invalid order id"),
    body("reason")
      .trim()
      .isIn(REPLACEMENT_REASONS)
      .withMessage(`Replacement reason must be one of: ${REPLACEMENT_REASONS.join(", ")}`),
  ],
  validateRequest,
  requestOrderReturn,
);
router.post(
  "/:orderId/reviews",
  [
    param("orderId").isMongoId().withMessage("Invalid order id"),
    body("orderItemId").isMongoId().withMessage("Invalid order item id"),
    body("productId").isMongoId().withMessage("Invalid product id"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
  ],
  validateRequest,
  createOrderReview,
);
router.post(
  "/checkout-session",
  deliveryDetailValidators,
  validateRequest,
  createCheckoutSession,
);
router.post(
  "/verify-payment",
  [
    ...deliveryDetailValidators,
    body("razorpayOrderId").trim().notEmpty().withMessage("Razorpay order id is required"),
    body("razorpayPaymentId")
      .trim()
      .notEmpty()
      .withMessage("Razorpay payment id is required"),
    body("razorpaySignature")
      .trim()
      .notEmpty()
      .withMessage("Razorpay signature is required"),
  ],
  validateRequest,
  verifyOrderPayment,
);

export default router;

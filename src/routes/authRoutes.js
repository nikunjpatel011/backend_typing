import { Router } from "express";
import { body } from "express-validator";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateProfile,
} from "../controllers/authController.js";
import { protectUser } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

const nameValidator = body("name")
  .trim()
  .notEmpty()
  .withMessage("Name is required");
const contactNumberValidator = body("contactNumber")
  .trim()
  .matches(/^[0-9+\-\s()]{10,15}$/)
  .withMessage("Contact number must be 10 to 15 characters");
const pinCodeValidator = body("pinCode")
  .trim()
  .matches(/^[0-9]{6}$/)
  .withMessage("Pin code must be 6 digits");
const passwordValidator = body("password")
  .trim()
  .isLength({ min: 4 })
  .withMessage("Password must be at least 4 characters");

router.post(
  "/register",
  [nameValidator, contactNumberValidator, pinCodeValidator, passwordValidator],
  validateRequest,
  registerUser,
);

router.post(
  "/login",
  [contactNumberValidator, passwordValidator],
  validateRequest,
  loginUser,
);

router.get("/me", protectUser, getCurrentUser);

router.put(
  "/profile",
  protectUser,
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
    body("password")
      .optional()
      .trim()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters"),
    body("profileImage").optional({ nullable: true }).isString(),
  ],
  validateRequest,
  updateProfile,
);

export default router;

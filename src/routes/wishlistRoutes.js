import { Router } from "express";
import { param } from "express-validator";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { protectUser } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.use(protectUser);

router.get("/", getWishlist);
router.post(
  "/:productId",
  [param("productId").isMongoId().withMessage("Invalid product id")],
  validateRequest,
  addToWishlist,
);
router.delete(
  "/:productId",
  [param("productId").isMongoId().withMessage("Invalid product id")],
  validateRequest,
  removeFromWishlist,
);

export default router;

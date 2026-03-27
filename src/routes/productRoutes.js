import { Router } from "express";
import { param } from "express-validator";
import {
  getProductById,
  getProducts,
} from "../controllers/productController.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.get("/", getProducts);
router.get(
  "/:productId",
  [param("productId").isMongoId().withMessage("Invalid product id")],
  validateRequest,
  getProductById,
);

export default router;

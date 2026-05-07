import { Router } from "express";

import {
  createProductHandler,
  deleteProductHandler,
  getProduct,
  getProducts,
  updateProductHandler,
} from "../controllers/product.controller";
import {
  adminOnly,
  roleMiddleware,
  verifyToken,
} from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/async-handler";

const productRouter = Router();

productRouter.get(
  "/",
  verifyToken,
  roleMiddleware(["admin", "cashier"]),
  asyncHandler(getProducts)
);
productRouter.get(
  "/:id",
  verifyToken,
  roleMiddleware(["admin", "cashier"]),
  asyncHandler(getProduct)
);
productRouter.post("/", verifyToken, adminOnly, asyncHandler(createProductHandler));
productRouter.put("/:id", verifyToken, adminOnly, asyncHandler(updateProductHandler));
productRouter.delete(
  "/:id",
  verifyToken,
  adminOnly,
  asyncHandler(deleteProductHandler)
);

export default productRouter;

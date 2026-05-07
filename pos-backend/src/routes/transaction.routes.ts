import { Router } from "express";

import {
  createTransactionHandler,
  getTransactionHandler,
  getTransactionsHandler,
} from "../controllers/transaction.controller";
import { roleMiddleware, verifyToken } from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/async-handler";

const transactionRouter = Router();

transactionRouter.use(verifyToken);
transactionRouter.use(roleMiddleware(["admin", "cashier"]));

transactionRouter.post("/", asyncHandler(createTransactionHandler));
transactionRouter.get("/", asyncHandler(getTransactionsHandler));
transactionRouter.get("/:id", asyncHandler(getTransactionHandler));

export default transactionRouter;

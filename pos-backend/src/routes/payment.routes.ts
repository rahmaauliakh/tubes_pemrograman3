import { Router } from "express";

import {
  checkPaymentStatusHandler,
  createPaymentHandler,
  midtransWebhookHandler,
  retryPaymentHandler,
} from "../controllers/payment.controller";
import { roleMiddleware, verifyToken } from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/async-handler";

const paymentRouter = Router();

paymentRouter.post("/webhook", asyncHandler(midtransWebhookHandler));

paymentRouter.use(verifyToken);
paymentRouter.use(roleMiddleware(["admin", "cashier"]));

paymentRouter.post("/create/:transactionId", asyncHandler(createPaymentHandler));
paymentRouter.get("/status/:transactionId", asyncHandler(checkPaymentStatusHandler));
paymentRouter.post("/retry/:transactionId", asyncHandler(retryPaymentHandler));

export default paymentRouter;

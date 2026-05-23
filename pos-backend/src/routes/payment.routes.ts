import { Router } from "express";

import {
  createPaymentHandler,
  midtransWebhookHandler,
} from "../controllers/payment.controller";
import { roleMiddleware, verifyToken } from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/async-handler";

const paymentRouter = Router();

paymentRouter.post("/webhook", asyncHandler(midtransWebhookHandler));

paymentRouter.use(verifyToken);
paymentRouter.use(roleMiddleware(["admin", "cashier"]));

paymentRouter.post("/create/:transactionId", asyncHandler(createPaymentHandler));

export default paymentRouter;

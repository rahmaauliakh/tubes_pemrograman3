import { Request, Response } from "express";

import { env } from "../config/env";
import {
  createPayment,
  processMidtransWebhook,
} from "../services/payment.service";
import {
  validateCreatePaymentParams,
  validateMidtransWebhookPayload,
  verifyMidtransSignature,
} from "../utils/payment-validator";

export const createPaymentHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { transactionId } = validateCreatePaymentParams(req.params);
  const payment = await createPayment(transactionId);

  res.status(201).json({
    success: true,
    message: "Midtrans payment created successfully.",
    data: {
      transactionId: payment.transactionId,
      orderId: payment.orderId,
      totalAmount: payment.totalAmount,
      paymentStatus: payment.paymentStatus,
      snapToken: payment.snapToken,
      redirectUrl: payment.redirectUrl,
      clientKey: env.MIDTRANS_CLIENT_KEY,
      isProduction: env.MIDTRANS_IS_PRODUCTION,
    },
  });
};

export const midtransWebhookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const payload = validateMidtransWebhookPayload(req.body);
  verifyMidtransSignature(payload);

  const result = await processMidtransWebhook(payload);

  res.status(200).json({
    success: true,
    message: "Midtrans webhook processed successfully.",
    data: result,
  });
};

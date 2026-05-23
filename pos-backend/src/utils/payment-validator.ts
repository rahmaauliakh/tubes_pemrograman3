import { createHash } from "crypto";

import { env } from "../config/env";
import { ApiError } from "./api-error";

export type CreatePaymentParams = {
  transactionId: number;
};

export type MidtransWebhookPayload = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  payment_type?: string;
  transaction_id?: string;
  fraud_status?: string;
};

const validatePositiveInteger = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) {
    throw new ApiError(400, `${fieldName} must be a positive integer.`);
  }

  return value;
};

const validateString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return value;
};

export const validateCreatePaymentParams = (params: unknown): CreatePaymentParams => {
  if (!params || typeof params !== "object") {
    throw new ApiError(400, "Transaction id is required.");
  }

  const payload = params as Record<string, unknown>;

  return {
    transactionId: validatePositiveInteger(
      Number(payload.transactionId),
      "transactionId"
    ),
  };
};

export const validateMidtransWebhookPayload = (
  body: unknown
): MidtransWebhookPayload => {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Webhook payload is required.");
  }

  const payload = body as Record<string, unknown>;

  return {
    order_id: validateString(payload.order_id, "order_id"),
    status_code: validateString(payload.status_code, "status_code"),
    gross_amount: validateString(payload.gross_amount, "gross_amount"),
    signature_key: validateString(payload.signature_key, "signature_key"),
    transaction_status: validateString(
      payload.transaction_status,
      "transaction_status"
    ),
    payment_type:
      typeof payload.payment_type === "string" ? payload.payment_type : undefined,
    transaction_id:
      typeof payload.transaction_id === "string"
        ? payload.transaction_id
        : undefined,
    fraud_status:
      typeof payload.fraud_status === "string" ? payload.fraud_status : undefined,
  };
};

export const verifyMidtransSignature = (payload: MidtransWebhookPayload): void => {
  const expectedSignature = createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${env.MIDTRANS_SERVER_KEY}`
    )
    .digest("hex");

  if (payload.signature_key !== expectedSignature) {
    throw new ApiError(401, "Invalid Midtrans signature.");
  }
};

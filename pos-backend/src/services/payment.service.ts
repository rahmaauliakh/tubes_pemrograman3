import { PaymentStatus, Prisma } from "@prisma/client";

import { env } from "../config/env";
import { snap } from "../config/midtrans";
import { prisma } from "../config/prisma";
import { publishEvent } from "../messaging/rabbitmq";
import { sendPaymentInvoiceWhatsApp } from "./whatsapp.service";
import { ApiError } from "../utils/api-error";
import { MidtransWebhookPayload } from "../utils/payment-validator";

const paymentTransactionSelect = {
  id: true,
  totalAmount: true,
  paymentStatus: true,
  paymentMethod: true,
  midtransTransactionId: true,
  midtransOrderId: true,
  customerPhone: true,
  cashier: {
    select: {
      id: true,
      username: true,
    },
  },
  items: {
    select: {
      quantity: true,
      price: true,
      subtotal: true,
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.TransactionSelect;

type PaymentTransactionRecord = Prisma.TransactionGetPayload<{
  select: typeof paymentTransactionSelect;
}>;

type SnapTransactionParameter = {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  item_details: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  customer_details: {
    first_name: string;
  };
};

type SnapCreateTransactionResult = {
  token: string;
  redirect_url: string;
};

type PaymentResult = {
  transactionId: number;
  orderId: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  snapToken: string;
  redirectUrl: string;
};

type PaymentStatusCheckResult = {
  transactionId: number;
  orderId: string | null;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  midtransTransactionId: string | null;
  midtransStatus: string | null;
  lastSyncedAt: Date | null;
  source: "local" | "midtrans";
};

type MidtransStatusResponse = {
  order_id: string;
  transaction_status: string;
  payment_type?: string;
  transaction_id?: string;
  fraud_status?: string;
};

const createMidtransOrderId = (transactionId: number): string => {
  return `POS-${transactionId}-${Date.now()}`;
};

const getMidtransApiBaseUrl = (): string => {
  return env.MIDTRANS_IS_PRODUCTION
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
};

const extractTransactionIdFromOrderId = (orderId: string): number => {
  const parts = orderId.split("-");
  const transactionId = Number(parts[1]);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    throw new ApiError(400, "Invalid Midtrans order id.");
  }

  return transactionId;
};

const mapWebhookStatusToPaymentStatus = (
  payload: MidtransWebhookPayload
): PaymentStatus => {
  if (payload.transaction_status === "settlement") {
    return "paid";
  }

  if (payload.transaction_status === "capture") {
    return payload.fraud_status === "challenge" ? "pending" : "paid";
  }

  if (payload.transaction_status === "pending") {
    return "pending";
  }

  return "failed";
};

const mapMidtransStatusToPaymentStatus = (payload: {
  transaction_status: string;
  fraud_status?: string;
}): PaymentStatus => {
  return mapWebhookStatusToPaymentStatus({
    order_id: "",
    status_code: "",
    gross_amount: "",
    signature_key: "",
    transaction_status: payload.transaction_status,
    fraud_status: payload.fraud_status,
  });
};

const syncTransactionPaymentStatus = async (
  transactionId: number,
  midtransStatus: MidtransStatusResponse
): Promise<PaymentStatusCheckResult> => {
  const paymentStatus = mapMidtransStatusToPaymentStatus(midtransStatus);

  const updatedTransaction = await prisma.transaction.update({
    where: {
      id: transactionId,
    },
    data: {
      paymentStatus,
      paymentMethod: midtransStatus.payment_type ?? null,
      midtransTransactionId: midtransStatus.transaction_id ?? null,
      midtransOrderId: midtransStatus.order_id,
    },
    select: {
      id: true,
      paymentStatus: true,
      paymentMethod: true,
      midtransTransactionId: true,
      midtransOrderId: true,
      updatedAt: true,
    },
  });

  await publishEvent("payment.status_synced", {
    transactionId: updatedTransaction.id,
    orderId: updatedTransaction.midtransOrderId,
    paymentStatus: updatedTransaction.paymentStatus,
    paymentMethod: updatedTransaction.paymentMethod,
    midtransTransactionId: updatedTransaction.midtransTransactionId,
    midtransStatus: midtransStatus.transaction_status,
    source: "midtrans",
  });

  return {
    transactionId: updatedTransaction.id,
    orderId: updatedTransaction.midtransOrderId,
    paymentStatus: updatedTransaction.paymentStatus,
    paymentMethod: updatedTransaction.paymentMethod,
    midtransTransactionId: updatedTransaction.midtransTransactionId,
    midtransStatus: midtransStatus.transaction_status,
    lastSyncedAt: updatedTransaction.updatedAt,
    source: "midtrans",
  };
};

const getMidtransTransactionStatus = async (
  orderId: string
): Promise<MidtransStatusResponse> => {
  const credentials = Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString(
    "base64"
  );

  const response = await fetch(
    `${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    }
  );

  if (response.status === 404) {
    throw new ApiError(404, "Midtrans transaction not found.");
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      `Failed to fetch Midtrans transaction status. HTTP ${response.status}.`
    );
  }

  const payload = (await response.json()) as Partial<MidtransStatusResponse>;

  if (
    typeof payload.order_id !== "string" ||
    typeof payload.transaction_status !== "string"
  ) {
    throw new ApiError(502, "Invalid Midtrans status response.");
  }

  return {
    order_id: payload.order_id,
    transaction_status: payload.transaction_status,
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

const getTransactionForPayment = async (
  transactionId: number
): Promise<PaymentTransactionRecord> => {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
    select: paymentTransactionSelect,
  });

  if (!transaction) {
    throw new ApiError(404, "Transaction not found.");
  }

  return transaction;
};

export const createPayment = async (
  transactionId: number
): Promise<PaymentResult> => {
  const transaction = await getTransactionForPayment(transactionId);

  if (transaction.paymentStatus === "paid") {
    throw new ApiError(400, "Transaction has already been paid.");
  }

  if (transaction.midtransOrderId) {
    throw new ApiError(
      400,
      "Payment has already been initialized for this transaction."
    );
  }

  const orderId = createMidtransOrderId(transaction.id);
  const grossAmount = Number(transaction.totalAmount);

  const snapPayload: SnapTransactionParameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: transaction.items.map((item) => {
      return {
        id: String(item.product.id),
        price: Number(item.price),
        quantity: item.quantity,
        name: item.product.name,
      };
    }),
    customer_details: {
      first_name: transaction.cashier.username,
    },
  };

  const snapResponse = (await snap.createTransaction(
    snapPayload
  )) as SnapCreateTransactionResult;

  await prisma.transaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      paymentStatus: "pending",
      midtransOrderId: orderId,
    },
  });

  const payment: PaymentResult = {
    transactionId: transaction.id,
    orderId,
    totalAmount: grossAmount,
    paymentStatus: "pending",
    snapToken: snapResponse.token,
    redirectUrl: snapResponse.redirect_url,
  };

  await publishEvent("payment.created", {
    transactionId: payment.transactionId,
    orderId: payment.orderId,
    totalAmount: payment.totalAmount,
    paymentStatus: payment.paymentStatus,
  });

  return payment;
};

export const checkPaymentStatus = async (
  transactionId: number
): Promise<PaymentStatusCheckResult> => {
  const transaction = await getTransactionForPayment(transactionId);

  if (!transaction.midtransOrderId) {
    return {
      transactionId: transaction.id,
      orderId: null,
      paymentStatus: transaction.paymentStatus,
      paymentMethod: transaction.paymentMethod,
      midtransTransactionId: transaction.midtransTransactionId,
      midtransStatus: null,
      lastSyncedAt: null,
      source: "local",
    };
  }

  const midtransStatus = await getMidtransTransactionStatus(
    transaction.midtransOrderId
  );

  return syncTransactionPaymentStatus(transaction.id, midtransStatus);
};

export const retryPayment = async (
  transactionId: number
): Promise<PaymentResult> => {
  const transaction = await getTransactionForPayment(transactionId);

  if (transaction.paymentStatus === "paid") {
    throw new ApiError(400, "Transaction has already been paid.");
  }

  if (transaction.midtransOrderId) {
    const currentStatus = await getMidtransTransactionStatus(
      transaction.midtransOrderId
    );
    const syncedStatus = await syncTransactionPaymentStatus(
      transaction.id,
      currentStatus
    );

    if (syncedStatus.paymentStatus === "paid") {
      throw new ApiError(400, "Transaction has already been paid.");
    }

    if (syncedStatus.paymentStatus === "pending") {
      throw new ApiError(
        400,
        "Existing Midtrans payment is still pending and cannot be retried yet."
      );
    }
  }

  await prisma.transaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      paymentStatus: "pending",
      paymentMethod: null,
      midtransTransactionId: null,
      midtransOrderId: null,
    },
  });

  return createPayment(transaction.id);
};

export const processMidtransWebhook = async (
  payload: MidtransWebhookPayload
) => {
  const transactionId = extractTransactionIdFromOrderId(payload.order_id);
  const paymentStatus = mapWebhookStatusToPaymentStatus(payload);

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
    select: {
      id: true,
      paymentStatus: true,
      midtransOrderId: true,
    },
  });

  if (!transaction) {
    throw new ApiError(404, "Transaction not found.");
  }

  if (transaction.midtransOrderId !== payload.order_id) {
    throw new ApiError(400, "Webhook order id does not match transaction.");
  }

  if (transaction.paymentStatus === "paid") {
    return {
      transactionId: transaction.id,
      paymentStatus: transaction.paymentStatus,
      alreadyProcessed: true,
    };
  }

  const updatedTransaction = await prisma.transaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      paymentStatus,
      paymentMethod: payload.payment_type ?? null,
      midtransTransactionId: payload.transaction_id ?? null,
    },
    select: {
      id: true,
      totalAmount: true,
      paymentStatus: true,
      paymentMethod: true,
      midtransTransactionId: true,
      customerPhone: true,
      updatedAt: true,
    },
  });

  await publishEvent("payment.webhook_processed", {
    transactionId: updatedTransaction.id,
    paymentStatus: updatedTransaction.paymentStatus,
    paymentMethod: updatedTransaction.paymentMethod,
    midtransTransactionId: updatedTransaction.midtransTransactionId,
    orderId: payload.order_id,
    midtransStatus: payload.transaction_status,
  });

  if (updatedTransaction.paymentStatus === "paid") {
    try {
      await sendPaymentInvoiceWhatsApp({
        transactionId: updatedTransaction.id,
        totalAmount: Number(updatedTransaction.totalAmount),
        paymentStatus: updatedTransaction.paymentStatus,
        paymentMethod: updatedTransaction.paymentMethod,
        customerPhone: updatedTransaction.customerPhone,
      });
    } catch (error: unknown) {
      console.error("Failed to send WhatsApp invoice notification:", error);
    }
  }

  return {
    transactionId: updatedTransaction.id,
    paymentStatus: updatedTransaction.paymentStatus,
    paymentMethod: updatedTransaction.paymentMethod,
    midtransTransactionId: updatedTransaction.midtransTransactionId,
    updatedAt: updatedTransaction.updatedAt,
    alreadyProcessed: false,
  };
};

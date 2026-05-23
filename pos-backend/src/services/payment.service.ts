import { PaymentStatus, Prisma } from "@prisma/client";

import { snap } from "../config/midtrans";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { MidtransWebhookPayload } from "../utils/payment-validator";

const paymentTransactionSelect = {
  id: true,
  totalAmount: true,
  paymentStatus: true,
  paymentMethod: true,
  midtransTransactionId: true,
  midtransOrderId: true,
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

const createMidtransOrderId = (transactionId: number): string => {
  return `POS-${transactionId}-${Date.now()}`;
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

  return {
    transactionId: transaction.id,
    orderId,
    totalAmount: grossAmount,
    paymentStatus: "pending",
    snapToken: snapResponse.token,
    redirectUrl: snapResponse.redirect_url,
  };
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
      paymentStatus: true,
      paymentMethod: true,
      midtransTransactionId: true,
      updatedAt: true,
    },
  });

  return {
    transactionId: updatedTransaction.id,
    paymentStatus: updatedTransaction.paymentStatus,
    paymentMethod: updatedTransaction.paymentMethod,
    midtransTransactionId: updatedTransaction.midtransTransactionId,
    updatedAt: updatedTransaction.updatedAt,
    alreadyProcessed: false,
  };
};

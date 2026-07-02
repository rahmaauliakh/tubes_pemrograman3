import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { getAllProducts, getProductById } from "../services/product.service";
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
} from "../services/transaction.service";
import { checkPaymentStatus } from "../services/payment.service";

type GrpcCallback<T> = (error: grpc.ServiceError | null, response?: T) => void;

type GrpcCall<T> = {
  request: T;
};

type CreateTransactionGrpcRequest = {
  items?: Array<{
    productId?: number;
    product_id?: number;
    quantity?: number;
  }>;
  customerPhone?: string;
  customer_phone?: string;
  cashierId?: number;
  cashier_id?: number;
  cashierUsername?: string;
  cashier_username?: string;
  cashierRole?: string;
  cashier_role?: string;
};

const protoPath = path.resolve(process.cwd(), "proto", "pos.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as {
  pos: {
    PosService: grpc.ServiceClientConstructor & {
      service: grpc.ServiceDefinition;
    };
  };
};

const toGrpcError = (error: unknown): grpc.ServiceError => {
  if (error instanceof ApiError) {
    const grpcError = new Error(error.message) as grpc.ServiceError;
    grpcError.code =
      error.statusCode === 404
        ? grpc.status.NOT_FOUND
        : error.statusCode === 401
          ? grpc.status.UNAUTHENTICATED
          : error.statusCode === 403
            ? grpc.status.PERMISSION_DENIED
            : error.statusCode >= 500
              ? grpc.status.INTERNAL
              : grpc.status.INVALID_ARGUMENT;

    return grpcError;
  }

  const grpcError = new Error("Internal server error.") as grpc.ServiceError;
  grpcError.code = grpc.status.INTERNAL;
  return grpcError;
};

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) {
    return "";
  }

  return value instanceof Date ? value.toISOString() : value;
};

const normalizeTransaction = (transaction: any) => {
  return {
    id: transaction.id,
    totalAmount: transaction.totalAmount,
    paymentStatus: transaction.paymentStatus,
    paymentMethod: transaction.paymentMethod ?? "",
    midtransTransactionId: transaction.midtransTransactionId ?? "",
    customerPhone: transaction.customerPhone ?? "",
    createdAt: formatDate(transaction.createdAt),
    cashierId: transaction.cashierId,
    cashier: transaction.cashier
      ? {
          id: transaction.cashier.id,
          username: transaction.cashier.username,
          role: transaction.cashier.role,
        }
      : undefined,
    items:
      transaction.items?.map((item: any) => {
        return {
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          product: item.product,
        };
      }) ?? [],
  };
};

const getRequiredPositiveInteger = (
  value: unknown,
  fieldName: string
): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ApiError(400, `${fieldName} must be a positive integer.`);
  }

  return value;
};

const posServiceHandlers = {
  getProduct: async (
    call: GrpcCall<{ id: number }>,
    callback: GrpcCallback<unknown>
  ) => {
    try {
      callback(null, await getProductById(call.request.id));
    } catch (error: unknown) {
      callback(toGrpcError(error));
    }
  },

  listProducts: async (_call: GrpcCall<unknown>, callback: GrpcCallback<unknown>) => {
    try {
      const products = await getAllProducts();
      callback(null, { products });
    } catch (error: unknown) {
      callback(toGrpcError(error));
    }
  },

  createTransaction: async (
    call: GrpcCall<CreateTransactionGrpcRequest>,
    callback: GrpcCallback<unknown>
  ) => {
    try {
      const request = call.request;
      const cashierId = request.cashierId ?? request.cashier_id;
      const cashierUsername = request.cashierUsername ?? request.cashier_username;
      const cashierRole = request.cashierRole ?? request.cashier_role ?? "cashier";

      const transaction = await createTransaction(
        {
          customerPhone: request.customerPhone ?? request.customer_phone,
          items:
            request.items?.map((item) => {
              return {
                productId: getRequiredPositiveInteger(
                  item.productId ?? item.product_id,
                  "items.productId"
                ),
                quantity: getRequiredPositiveInteger(
                  item.quantity,
                  "items.quantity"
                ),
              };
            }) ?? [],
        },
        {
          userId: getRequiredPositiveInteger(cashierId, "cashierId"),
          username:
            typeof cashierUsername === "string" && cashierUsername.trim()
              ? cashierUsername
              : "grpc-cashier",
          role:
            cashierRole === "admin" || cashierRole === "cashier"
              ? cashierRole
              : "cashier",
        }
      );

      callback(null, normalizeTransaction(transaction));
    } catch (error: unknown) {
      callback(toGrpcError(error));
    }
  },

  getTransaction: async (
    call: GrpcCall<{ id: number }>,
    callback: GrpcCallback<unknown>
  ) => {
    try {
      const transaction = await getTransactionById(call.request.id);
      callback(null, normalizeTransaction(transaction));
    } catch (error: unknown) {
      callback(toGrpcError(error));
    }
  },

  listTransactions: async (
    _call: GrpcCall<unknown>,
    callback: GrpcCallback<unknown>
  ) => {
    try {
      const transactions = await getAllTransactions();
      callback(null, {
        transactions: transactions.map(normalizeTransaction),
      });
    } catch (error: unknown) {
      callback(toGrpcError(error));
    }
  },

  checkPaymentStatus: async (
    call: GrpcCall<{ id: number }>,
    callback: GrpcCallback<unknown>
  ) => {
    try {
      const paymentStatus = await checkPaymentStatus(call.request.id);
      callback(null, {
        transactionId: paymentStatus.transactionId,
        orderId: paymentStatus.orderId ?? "",
        paymentStatus: paymentStatus.paymentStatus,
        paymentMethod: paymentStatus.paymentMethod ?? "",
        midtransTransactionId: paymentStatus.midtransTransactionId ?? "",
        midtransStatus: paymentStatus.midtransStatus ?? "",
        lastSyncedAt: formatDate(paymentStatus.lastSyncedAt),
        source: paymentStatus.source,
      });
    } catch (error: unknown) {
      callback(toGrpcError(error));
    }
  },
};

export const startGrpcServer = (): grpc.Server => {
  const server = new grpc.Server();

  server.addService(protoDescriptor.pos.PosService.service, posServiceHandlers);
  server.bindAsync(
    `${env.GRPC_HOST}:${env.GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error("Failed to start gRPC server:", error);
        return;
      }

      console.log(`gRPC server running on ${env.GRPC_HOST}:${port}`);
    }
  );

  return server;
};

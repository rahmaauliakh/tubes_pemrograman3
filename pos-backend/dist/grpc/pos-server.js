"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGrpcServer = void 0;
const path_1 = __importDefault(require("path"));
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const env_1 = require("../config/env");
const api_error_1 = require("../utils/api-error");
const product_service_1 = require("../services/product.service");
const transaction_service_1 = require("../services/transaction.service");
const payment_service_1 = require("../services/payment.service");
const protoPath = path_1.default.resolve(process.cwd(), "proto", "pos.proto");
const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const toGrpcError = (error) => {
    if (error instanceof api_error_1.ApiError) {
        const grpcError = new Error(error.message);
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
    const grpcError = new Error("Internal server error.");
    grpcError.code = grpc.status.INTERNAL;
    return grpcError;
};
const formatDate = (value) => {
    if (!value) {
        return "";
    }
    return value instanceof Date ? value.toISOString() : value;
};
const normalizeTransaction = (transaction) => {
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
        items: transaction.items?.map((item) => {
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
const getRequiredPositiveInteger = (value, fieldName) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new api_error_1.ApiError(400, `${fieldName} must be a positive integer.`);
    }
    return value;
};
const posServiceHandlers = {
    getProduct: async (call, callback) => {
        try {
            callback(null, await (0, product_service_1.getProductById)(call.request.id));
        }
        catch (error) {
            callback(toGrpcError(error));
        }
    },
    listProducts: async (_call, callback) => {
        try {
            const products = await (0, product_service_1.getAllProducts)();
            callback(null, { products });
        }
        catch (error) {
            callback(toGrpcError(error));
        }
    },
    createTransaction: async (call, callback) => {
        try {
            const request = call.request;
            const cashierId = request.cashierId ?? request.cashier_id;
            const cashierUsername = request.cashierUsername ?? request.cashier_username;
            const cashierRole = request.cashierRole ?? request.cashier_role ?? "cashier";
            const transaction = await (0, transaction_service_1.createTransaction)({
                customerPhone: request.customerPhone ?? request.customer_phone,
                items: request.items?.map((item) => {
                    return {
                        productId: getRequiredPositiveInteger(item.productId ?? item.product_id, "items.productId"),
                        quantity: getRequiredPositiveInteger(item.quantity, "items.quantity"),
                    };
                }) ?? [],
            }, {
                userId: getRequiredPositiveInteger(cashierId, "cashierId"),
                username: typeof cashierUsername === "string" && cashierUsername.trim()
                    ? cashierUsername
                    : "grpc-cashier",
                role: cashierRole === "admin" || cashierRole === "cashier"
                    ? cashierRole
                    : "cashier",
            });
            callback(null, normalizeTransaction(transaction));
        }
        catch (error) {
            callback(toGrpcError(error));
        }
    },
    getTransaction: async (call, callback) => {
        try {
            const transaction = await (0, transaction_service_1.getTransactionById)(call.request.id);
            callback(null, normalizeTransaction(transaction));
        }
        catch (error) {
            callback(toGrpcError(error));
        }
    },
    listTransactions: async (_call, callback) => {
        try {
            const transactions = await (0, transaction_service_1.getAllTransactions)();
            callback(null, {
                transactions: transactions.map(normalizeTransaction),
            });
        }
        catch (error) {
            callback(toGrpcError(error));
        }
    },
    checkPaymentStatus: async (call, callback) => {
        try {
            const paymentStatus = await (0, payment_service_1.checkPaymentStatus)(call.request.id);
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
        }
        catch (error) {
            callback(toGrpcError(error));
        }
    },
};
const startGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(protoDescriptor.pos.PosService.service, posServiceHandlers);
    server.bindAsync(`${env_1.env.GRPC_HOST}:${env_1.env.GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error("Failed to start gRPC server:", error);
            return;
        }
        console.log(`gRPC server running on ${env_1.env.GRPC_HOST}:${port}`);
    });
    return server;
};
exports.startGrpcServer = startGrpcServer;

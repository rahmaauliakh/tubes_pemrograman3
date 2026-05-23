"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMidtransWebhook = exports.createPayment = void 0;
const midtrans_1 = require("../config/midtrans");
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
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
};
const createMidtransOrderId = (transactionId) => {
    return `POS-${transactionId}-${Date.now()}`;
};
const extractTransactionIdFromOrderId = (orderId) => {
    const parts = orderId.split("-");
    const transactionId = Number(parts[1]);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
        throw new api_error_1.ApiError(400, "Invalid Midtrans order id.");
    }
    return transactionId;
};
const mapWebhookStatusToPaymentStatus = (payload) => {
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
const getTransactionForPayment = async (transactionId) => {
    const transaction = await prisma_1.prisma.transaction.findUnique({
        where: {
            id: transactionId,
        },
        select: paymentTransactionSelect,
    });
    if (!transaction) {
        throw new api_error_1.ApiError(404, "Transaction not found.");
    }
    return transaction;
};
const createPayment = async (transactionId) => {
    const transaction = await getTransactionForPayment(transactionId);
    if (transaction.paymentStatus === "paid") {
        throw new api_error_1.ApiError(400, "Transaction has already been paid.");
    }
    if (transaction.midtransOrderId) {
        throw new api_error_1.ApiError(400, "Payment has already been initialized for this transaction.");
    }
    const orderId = createMidtransOrderId(transaction.id);
    const grossAmount = Number(transaction.totalAmount);
    const snapPayload = {
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
    const snapResponse = (await midtrans_1.snap.createTransaction(snapPayload));
    await prisma_1.prisma.transaction.update({
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
exports.createPayment = createPayment;
const processMidtransWebhook = async (payload) => {
    const transactionId = extractTransactionIdFromOrderId(payload.order_id);
    const paymentStatus = mapWebhookStatusToPaymentStatus(payload);
    const transaction = await prisma_1.prisma.transaction.findUnique({
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
        throw new api_error_1.ApiError(404, "Transaction not found.");
    }
    if (transaction.midtransOrderId !== payload.order_id) {
        throw new api_error_1.ApiError(400, "Webhook order id does not match transaction.");
    }
    if (transaction.paymentStatus === "paid") {
        return {
            transactionId: transaction.id,
            paymentStatus: transaction.paymentStatus,
            alreadyProcessed: true,
        };
    }
    const updatedTransaction = await prisma_1.prisma.transaction.update({
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
exports.processMidtransWebhook = processMidtransWebhook;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMidtransWebhook = exports.retryPayment = exports.checkPaymentStatus = exports.createPayment = void 0;
const env_1 = require("../config/env");
const midtrans_1 = require("../config/midtrans");
const prisma_1 = require("../config/prisma");
const rabbitmq_1 = require("../messaging/rabbitmq");
const whatsapp_service_1 = require("./whatsapp.service");
const api_error_1 = require("../utils/api-error");
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
};
const createMidtransOrderId = (transactionId) => {
    return `POS-${transactionId}-${Date.now()}`;
};
const getMidtransApiBaseUrl = () => {
    return env_1.env.MIDTRANS_IS_PRODUCTION
        ? "https://api.midtrans.com"
        : "https://api.sandbox.midtrans.com";
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
const mapMidtransStatusToPaymentStatus = (payload) => {
    return mapWebhookStatusToPaymentStatus({
        order_id: "",
        status_code: "",
        gross_amount: "",
        signature_key: "",
        transaction_status: payload.transaction_status,
        fraud_status: payload.fraud_status,
    });
};
const syncTransactionPaymentStatus = async (transactionId, midtransStatus) => {
    const paymentStatus = mapMidtransStatusToPaymentStatus(midtransStatus);
    const updatedTransaction = await prisma_1.prisma.transaction.update({
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
    await (0, rabbitmq_1.publishEvent)("payment.status_synced", {
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
const getMidtransTransactionStatus = async (orderId) => {
    const credentials = Buffer.from(`${env_1.env.MIDTRANS_SERVER_KEY}:`).toString("base64");
    const response = await fetch(`${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
        method: "GET",
        headers: {
            Authorization: `Basic ${credentials}`,
            Accept: "application/json",
        },
    });
    if (response.status === 404) {
        throw new api_error_1.ApiError(404, "Midtrans transaction not found.");
    }
    if (!response.ok) {
        throw new api_error_1.ApiError(502, `Failed to fetch Midtrans transaction status. HTTP ${response.status}.`);
    }
    const payload = (await response.json());
    if (typeof payload.order_id !== "string" ||
        typeof payload.transaction_status !== "string") {
        throw new api_error_1.ApiError(502, "Invalid Midtrans status response.");
    }
    return {
        order_id: payload.order_id,
        transaction_status: payload.transaction_status,
        payment_type: typeof payload.payment_type === "string" ? payload.payment_type : undefined,
        transaction_id: typeof payload.transaction_id === "string"
            ? payload.transaction_id
            : undefined,
        fraud_status: typeof payload.fraud_status === "string" ? payload.fraud_status : undefined,
    };
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
    const payment = {
        transactionId: transaction.id,
        orderId,
        totalAmount: grossAmount,
        paymentStatus: "pending",
        snapToken: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
    };
    await (0, rabbitmq_1.publishEvent)("payment.created", {
        transactionId: payment.transactionId,
        orderId: payment.orderId,
        totalAmount: payment.totalAmount,
        paymentStatus: payment.paymentStatus,
    });
    return payment;
};
exports.createPayment = createPayment;
const checkPaymentStatus = async (transactionId) => {
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
    const midtransStatus = await getMidtransTransactionStatus(transaction.midtransOrderId);
    return syncTransactionPaymentStatus(transaction.id, midtransStatus);
};
exports.checkPaymentStatus = checkPaymentStatus;
const retryPayment = async (transactionId) => {
    const transaction = await getTransactionForPayment(transactionId);
    if (transaction.paymentStatus === "paid") {
        throw new api_error_1.ApiError(400, "Transaction has already been paid.");
    }
    if (transaction.midtransOrderId) {
        const currentStatus = await getMidtransTransactionStatus(transaction.midtransOrderId);
        const syncedStatus = await syncTransactionPaymentStatus(transaction.id, currentStatus);
        if (syncedStatus.paymentStatus === "paid") {
            throw new api_error_1.ApiError(400, "Transaction has already been paid.");
        }
        if (syncedStatus.paymentStatus === "pending") {
            throw new api_error_1.ApiError(400, "Existing Midtrans payment is still pending and cannot be retried yet.");
        }
    }
    await prisma_1.prisma.transaction.update({
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
    return (0, exports.createPayment)(transaction.id);
};
exports.retryPayment = retryPayment;
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
            totalAmount: true,
            paymentStatus: true,
            paymentMethod: true,
            midtransTransactionId: true,
            customerPhone: true,
            updatedAt: true,
        },
    });
    await (0, rabbitmq_1.publishEvent)("payment.webhook_processed", {
        transactionId: updatedTransaction.id,
        paymentStatus: updatedTransaction.paymentStatus,
        paymentMethod: updatedTransaction.paymentMethod,
        midtransTransactionId: updatedTransaction.midtransTransactionId,
        orderId: payload.order_id,
        midtransStatus: payload.transaction_status,
    });
    if (updatedTransaction.paymentStatus === "paid") {
        try {
            await (0, whatsapp_service_1.sendPaymentInvoiceWhatsApp)({
                transactionId: updatedTransaction.id,
                totalAmount: Number(updatedTransaction.totalAmount),
                paymentStatus: updatedTransaction.paymentStatus,
                paymentMethod: updatedTransaction.paymentMethod,
                customerPhone: updatedTransaction.customerPhone,
            });
        }
        catch (error) {
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
exports.processMidtransWebhook = processMidtransWebhook;

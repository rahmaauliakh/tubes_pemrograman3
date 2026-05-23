"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.midtransWebhookHandler = exports.retryPaymentHandler = exports.checkPaymentStatusHandler = exports.createPaymentHandler = void 0;
const env_1 = require("../config/env");
const payment_service_1 = require("../services/payment.service");
const payment_validator_1 = require("../utils/payment-validator");
const createPaymentHandler = async (req, res) => {
    const { transactionId } = (0, payment_validator_1.validateCreatePaymentParams)(req.params);
    const payment = await (0, payment_service_1.createPayment)(transactionId);
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
            clientKey: env_1.env.MIDTRANS_CLIENT_KEY,
            isProduction: env_1.env.MIDTRANS_IS_PRODUCTION,
        },
    });
};
exports.createPaymentHandler = createPaymentHandler;
const checkPaymentStatusHandler = async (req, res) => {
    const { transactionId } = (0, payment_validator_1.validateCreatePaymentParams)(req.params);
    const paymentStatus = await (0, payment_service_1.checkPaymentStatus)(transactionId);
    res.status(200).json({
        success: true,
        message: "Midtrans payment status fetched successfully.",
        data: paymentStatus,
    });
};
exports.checkPaymentStatusHandler = checkPaymentStatusHandler;
const retryPaymentHandler = async (req, res) => {
    const { transactionId } = (0, payment_validator_1.validateCreatePaymentParams)(req.params);
    const payment = await (0, payment_service_1.retryPayment)(transactionId);
    res.status(201).json({
        success: true,
        message: "Midtrans payment retried successfully.",
        data: {
            transactionId: payment.transactionId,
            orderId: payment.orderId,
            totalAmount: payment.totalAmount,
            paymentStatus: payment.paymentStatus,
            snapToken: payment.snapToken,
            redirectUrl: payment.redirectUrl,
            clientKey: env_1.env.MIDTRANS_CLIENT_KEY,
            isProduction: env_1.env.MIDTRANS_IS_PRODUCTION,
        },
    });
};
exports.retryPaymentHandler = retryPaymentHandler;
const midtransWebhookHandler = async (req, res) => {
    const payload = (0, payment_validator_1.validateMidtransWebhookPayload)(req.body);
    (0, payment_validator_1.verifyMidtransSignature)(payload);
    const result = await (0, payment_service_1.processMidtransWebhook)(payload);
    res.status(200).json({
        success: true,
        message: "Midtrans webhook processed successfully.",
        data: result,
    });
};
exports.midtransWebhookHandler = midtransWebhookHandler;

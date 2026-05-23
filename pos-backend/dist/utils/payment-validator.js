"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMidtransSignature = exports.validateMidtransWebhookPayload = exports.validateCreatePaymentParams = void 0;
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const api_error_1 = require("./api-error");
const validatePositiveInteger = (value, fieldName) => {
    if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) {
        throw new api_error_1.ApiError(400, `${fieldName} must be a positive integer.`);
    }
    return value;
};
const validateString = (value, fieldName) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new api_error_1.ApiError(400, `${fieldName} is required.`);
    }
    return value;
};
const validateCreatePaymentParams = (params) => {
    if (!params || typeof params !== "object") {
        throw new api_error_1.ApiError(400, "Transaction id is required.");
    }
    const payload = params;
    return {
        transactionId: validatePositiveInteger(Number(payload.transactionId), "transactionId"),
    };
};
exports.validateCreatePaymentParams = validateCreatePaymentParams;
const validateMidtransWebhookPayload = (body) => {
    if (!body || typeof body !== "object") {
        throw new api_error_1.ApiError(400, "Webhook payload is required.");
    }
    const payload = body;
    return {
        order_id: validateString(payload.order_id, "order_id"),
        status_code: validateString(payload.status_code, "status_code"),
        gross_amount: validateString(payload.gross_amount, "gross_amount"),
        signature_key: validateString(payload.signature_key, "signature_key"),
        transaction_status: validateString(payload.transaction_status, "transaction_status"),
        payment_type: typeof payload.payment_type === "string" ? payload.payment_type : undefined,
        transaction_id: typeof payload.transaction_id === "string"
            ? payload.transaction_id
            : undefined,
        fraud_status: typeof payload.fraud_status === "string" ? payload.fraud_status : undefined,
    };
};
exports.validateMidtransWebhookPayload = validateMidtransWebhookPayload;
const verifyMidtransSignature = (payload) => {
    const expectedSignature = (0, crypto_1.createHash)("sha512")
        .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${env_1.env.MIDTRANS_SERVER_KEY}`)
        .digest("hex");
    if (payload.signature_key !== expectedSignature) {
        throw new api_error_1.ApiError(401, "Invalid Midtrans signature.");
    }
};
exports.verifyMidtransSignature = verifyMidtransSignature;

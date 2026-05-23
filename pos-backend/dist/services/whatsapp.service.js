"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaymentInvoiceWhatsApp = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const api_error_1 = require("../utils/api-error");
const FONNTE_SEND_MESSAGE_URL = "https://api.fonnte.com/send";
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};
const normalizePhoneNumber = (value) => {
    const digitsOnly = value.replace(/[^\d]/g, "");
    if (digitsOnly.length < 9) {
        throw new api_error_1.ApiError(400, "WhatsApp phone number must contain at least 9 digits.");
    }
    if (digitsOnly.startsWith("62")) {
        return digitsOnly;
    }
    if (digitsOnly.startsWith("0")) {
        return `62${digitsOnly.slice(1)}`;
    }
    if (digitsOnly.startsWith("8")) {
        return `62${digitsOnly}`;
    }
    return digitsOnly;
};
const resolveTargetPhoneNumber = (customerPhone) => {
    if (customerPhone) {
        return normalizePhoneNumber(customerPhone);
    }
    if (env_1.env.FONNTE_DEFAULT_TARGET) {
        return normalizePhoneNumber(env_1.env.FONNTE_DEFAULT_TARGET);
    }
    throw new api_error_1.ApiError(500, "WhatsApp target number is not configured. Set customerPhone or FONNTE_DEFAULT_TARGET.");
};
const buildInvoiceMessage = (payload) => {
    const paymentMethod = payload.paymentMethod ?? "-";
    return [
        "Invoice Pembayaran POS",
        "",
        `Transaction ID: ${payload.transactionId}`,
        `Total Pembayaran: ${formatCurrency(payload.totalAmount)}`,
        `Status Pembayaran: ${payload.paymentStatus}`,
        `Metode Pembayaran: ${paymentMethod}`,
        "",
        "Pembayaran berhasil diproses. Terima kasih.",
    ].join("\n");
};
const sendPaymentInvoiceWhatsApp = async (payload) => {
    const target = resolveTargetPhoneNumber(payload.customerPhone);
    const message = buildInvoiceMessage(payload);
    const formData = new URLSearchParams();
    formData.set("target", target);
    formData.set("message", message);
    formData.set("countryCode", "0");
    formData.set("preview", "false");
    const response = await axios_1.default.post(FONNTE_SEND_MESSAGE_URL, formData.toString(), {
        headers: {
            Authorization: env_1.env.FONNTE_TOKEN,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    if (!response.data.status) {
        throw new api_error_1.ApiError(502, response.data.detail ?? "Failed to send WhatsApp message via Fonnte.");
    }
    return response.data;
};
exports.sendPaymentInvoiceWhatsApp = sendPaymentInvoiceWhatsApp;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateTransactionPayload = void 0;
const api_error_1 = require("./api-error");
const validatePositiveInteger = (value, fieldName) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new api_error_1.ApiError(400, `${fieldName} must be a positive integer.`);
    }
    return value;
};
const validateTransactionItem = (item, index) => {
    if (!item || typeof item !== "object") {
        throw new api_error_1.ApiError(400, `Item at index ${index} is invalid.`);
    }
    const payload = item;
    return {
        productId: validatePositiveInteger(payload.productId, `items[${index}].productId`),
        quantity: validatePositiveInteger(payload.quantity, `items[${index}].quantity`),
    };
};
const validateCreateTransactionPayload = (body) => {
    if (!body || typeof body !== "object") {
        throw new api_error_1.ApiError(400, "Request body is required.");
    }
    const payload = body;
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
        throw new api_error_1.ApiError(400, "Items must be a non-empty array.");
    }
    return {
        items: payload.items.map((item, index) => validateTransactionItem(item, index)),
    };
};
exports.validateCreateTransactionPayload = validateCreateTransactionPayload;

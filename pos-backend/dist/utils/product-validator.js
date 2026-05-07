"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProductId = exports.validateProductPayload = void 0;
const api_error_1 = require("./api-error");
const getStringField = (value, fieldName) => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new api_error_1.ApiError(400, `${fieldName} is required.`);
    }
    return value.trim();
};
const getPriceField = (value) => {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        throw new api_error_1.ApiError(400, "price must be a number greater than or equal to 0.");
    }
    return value;
};
const getStockField = (value) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new api_error_1.ApiError(400, "stock must be an integer greater than or equal to 0.");
    }
    return value;
};
const validateProductPayload = (body) => {
    if (!body || typeof body !== "object") {
        throw new api_error_1.ApiError(400, "Request body is required.");
    }
    const payload = body;
    return {
        name: getStringField(payload.name, "name"),
        price: getPriceField(payload.price),
        stock: getStockField(payload.stock),
    };
};
exports.validateProductPayload = validateProductPayload;
const validateProductId = (idParam) => {
    if (Array.isArray(idParam)) {
        throw new api_error_1.ApiError(400, "Product id must be a single value.");
    }
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
        throw new api_error_1.ApiError(400, "Product id must be a positive integer.");
    }
    return id;
};
exports.validateProductId = validateProductId;

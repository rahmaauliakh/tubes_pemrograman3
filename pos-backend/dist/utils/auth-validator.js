"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLoginPayload = exports.validateRegisterPayload = exports.roles = void 0;
const api_error_1 = require("./api-error");
exports.roles = ["admin", "cashier"];
const validateUsername = (value) => {
    if (typeof value !== "string") {
        throw new api_error_1.ApiError(400, "Username is required.");
    }
    const username = value.trim();
    if (username.length < 3) {
        throw new api_error_1.ApiError(400, "Username must be at least 3 characters.");
    }
    return username;
};
const validatePassword = (value) => {
    if (typeof value !== "string") {
        throw new api_error_1.ApiError(400, "Password is required.");
    }
    const password = value.trim();
    if (password.length < 6) {
        throw new api_error_1.ApiError(400, "Password must be at least 6 characters.");
    }
    return password;
};
const validateRole = (value) => {
    if (value === undefined) {
        return "cashier";
    }
    if (typeof value !== "string") {
        throw new api_error_1.ApiError(400, "Role must be admin or cashier.");
    }
    if (!exports.roles.includes(value)) {
        throw new api_error_1.ApiError(400, "Role must be admin or cashier.");
    }
    return value;
};
const validateRegisterPayload = (body) => {
    if (!body || typeof body !== "object") {
        throw new api_error_1.ApiError(400, "Request body is required.");
    }
    const payload = body;
    return {
        username: validateUsername(payload.username),
        password: validatePassword(payload.password),
        role: validateRole(payload.role),
    };
};
exports.validateRegisterPayload = validateRegisterPayload;
const validateLoginPayload = (body) => {
    if (!body || typeof body !== "object") {
        throw new api_error_1.ApiError(400, "Request body is required.");
    }
    const payload = body;
    return {
        username: validateUsername(payload.username),
        password: validatePassword(payload.password),
    };
};
exports.validateLoginPayload = validateLoginPayload;

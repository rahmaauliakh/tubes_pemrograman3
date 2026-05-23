"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const client_1 = require("@prisma/client");
const api_error_1 = require("../utils/api-error");
const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        success: false,
        message: "Route not found.",
        error: {
            method: req.method,
            path: req.originalUrl,
        },
        availableRoutes: [
            "GET /",
            "GET /api/auth",
            "POST /api/auth/register",
            "POST /api/auth/login",
            "GET /api/products",
            "GET /api/products/:id",
            "POST /api/products",
            "PUT /api/products/:id",
            "DELETE /api/products/:id",
            "POST /api/transactions",
            "GET /api/transactions",
            "GET /api/transactions/:id",
            "POST /api/payments/create/:transactionId",
            "POST /api/payments/webhook",
        ],
    });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, _req, res, _next) => {
    if (error instanceof api_error_1.ApiError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
        return;
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        res.status(409).json({
            success: false,
            message: "Data already exists.",
        });
        return;
    }
    console.error(error);
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};
exports.errorHandler = errorHandler;

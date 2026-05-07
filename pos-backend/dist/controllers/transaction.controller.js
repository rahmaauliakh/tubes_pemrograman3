"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionHandler = exports.getTransactionsHandler = exports.createTransactionHandler = void 0;
const transaction_service_1 = require("../services/transaction.service");
const api_error_1 = require("../utils/api-error");
const transaction_validator_1 = require("../utils/transaction-validator");
const getAuthenticatedUser = (req) => {
    if (!req.user) {
        throw new api_error_1.ApiError(401, "Unauthorized.");
    }
    return req.user;
};
const createTransactionHandler = async (req, res) => {
    const user = getAuthenticatedUser(req);
    const payload = (0, transaction_validator_1.validateCreateTransactionPayload)(req.body);
    const transaction = await (0, transaction_service_1.createTransaction)(payload, user);
    res.status(201).json({
        success: true,
        message: "Transaction created successfully.",
        data: transaction,
    });
};
exports.createTransactionHandler = createTransactionHandler;
const getTransactionsHandler = async (_req, res) => {
    const transactions = await (0, transaction_service_1.getAllTransactions)();
    res.status(200).json({
        success: true,
        message: "Transactions fetched successfully.",
        data: transactions,
        meta: {
            total: transactions.length,
        },
    });
};
exports.getTransactionsHandler = getTransactionsHandler;
const getTransactionHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        throw new api_error_1.ApiError(400, "Transaction id must be a positive integer.");
    }
    const transaction = await (0, transaction_service_1.getTransactionById)(id);
    res.status(200).json({
        success: true,
        message: "Transaction fetched successfully.",
        data: transaction,
    });
};
exports.getTransactionHandler = getTransactionHandler;

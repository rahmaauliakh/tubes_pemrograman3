import { Request, Response } from "express";

import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
} from "../services/transaction.service";
import { ApiError } from "../utils/api-error";
import { validateCreateTransactionPayload } from "../utils/transaction-validator";

const getAuthenticatedUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized.");
  }

  return req.user;
};

export const createTransactionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = getAuthenticatedUser(req);
  const payload = validateCreateTransactionPayload(req.body);
  const transaction = await createTransaction(payload, user);

  res.status(201).json({
    success: true,
    message: "Transaction created successfully.",
    data: transaction,
  });
};

export const getTransactionsHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const transactions = await getAllTransactions();

  res.status(200).json({
    success: true,
    message: "Transactions fetched successfully.",
    data: transactions,
    meta: {
      total: transactions.length,
    },
  });
};

export const getTransactionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Transaction id must be a positive integer.");
  }

  const transaction = await getTransactionById(id);

  res.status(200).json({
    success: true,
    message: "Transaction fetched successfully.",
    data: transaction,
  });
};

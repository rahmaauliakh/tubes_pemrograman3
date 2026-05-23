import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { ApiError } from "../utils/api-error";

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
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

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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

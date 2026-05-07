import { NextFunction, Request, Response } from "express";

import { verifyJwtToken } from "../services/auth.service";
import { ApiError } from "../utils/api-error";
import { Role } from "../utils/auth-validator";

const extractBearerToken = (authorizationHeader: string | undefined): string => {
  if (!authorizationHeader) {
    throw new ApiError(401, "Authorization header is required.");
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Invalid authorization format.");
  }

  return token;
};

export const verifyToken = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const token = extractBearerToken(req.headers.authorization);
  const decodedUser = verifyJwtToken(token);

  req.user = decodedUser;
  next();
};

export const adminOnly = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized.");
  }

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin only.");
  }

  next();
};

export const roleMiddleware = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized.");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Access denied. Insufficient role.");
    }

    next();
  };
};

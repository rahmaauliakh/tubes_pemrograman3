import { ApiError } from "./api-error";

export const roles = ["admin", "cashier"] as const;

export type Role = (typeof roles)[number];

export type RegisterPayload = {
  username: string;
  password: string;
  role: Role;
};

export type LoginPayload = {
  username: string;
  password: string;
};

const validateUsername = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new ApiError(400, "Username is required.");
  }

  const username = value.trim();

  if (username.length < 3) {
    throw new ApiError(400, "Username must be at least 3 characters.");
  }

  return username;
};

const validatePassword = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new ApiError(400, "Password is required.");
  }

  const password = value.trim();

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters.");
  }

  return password;
};

const validateRole = (value: unknown): Role => {
  if (value === undefined) {
    return "cashier";
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "Role must be admin or cashier.");
  }

  if (!roles.includes(value as Role)) {
    throw new ApiError(400, "Role must be admin or cashier.");
  }

  return value as Role;
};

export const validateRegisterPayload = (body: unknown): RegisterPayload => {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body is required.");
  }

  const payload = body as Record<string, unknown>;

  return {
    username: validateUsername(payload.username),
    password: validatePassword(payload.password),
    role: validateRole(payload.role),
  };
};

export const validateLoginPayload = (body: unknown): LoginPayload => {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body is required.");
  }

  const payload = body as Record<string, unknown>;

  return {
    username: validateUsername(payload.username),
    password: validatePassword(payload.password),
  };
};

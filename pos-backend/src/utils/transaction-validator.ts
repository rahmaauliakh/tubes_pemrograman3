import { ApiError } from "./api-error";

export type TransactionItemPayload = {
  productId: number;
  quantity: number;
};

export type CreateTransactionPayload = {
  items: TransactionItemPayload[];
  customerPhone?: string;
};

const validatePositiveInteger = (value: unknown, fieldName: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ApiError(400, `${fieldName} must be a positive integer.`);
  }

  return value;
};

const validateTransactionItem = (item: unknown, index: number): TransactionItemPayload => {
  if (!item || typeof item !== "object") {
    throw new ApiError(400, `Item at index ${index} is invalid.`);
  }

  const payload = item as Record<string, unknown>;

  return {
    productId: validatePositiveInteger(payload.productId, `items[${index}].productId`),
    quantity: validatePositiveInteger(payload.quantity, `items[${index}].quantity`),
  };
};

const validateOptionalPhoneNumber = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "customerPhone must be a string.");
  }

  const normalizedPhone = value.replace(/[^\d]/g, "");

  if (normalizedPhone.length < 9) {
    throw new ApiError(400, "customerPhone must contain at least 9 digits.");
  }

  return normalizedPhone;
};

export const validateCreateTransactionPayload = (
  body: unknown
): CreateTransactionPayload => {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body is required.");
  }

  const payload = body as Record<string, unknown>;

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ApiError(400, "Items must be a non-empty array.");
  }

  return {
    items: payload.items.map((item, index) => validateTransactionItem(item, index)),
    customerPhone: validateOptionalPhoneNumber(payload.customerPhone),
  };
};

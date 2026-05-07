import { ApiError } from "./api-error";

export type ProductPayload = {
  name: string;
  price: number;
  stock: number;
};

const getStringField = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return value.trim();
};

const getPriceField = (value: unknown): number => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new ApiError(400, "price must be a number greater than or equal to 0.");
  }

  return value;
};

const getStockField = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ApiError(400, "stock must be an integer greater than or equal to 0.");
  }

  return value;
};

export const validateProductPayload = (body: unknown): ProductPayload => {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body is required.");
  }

  const payload = body as Record<string, unknown>;

  return {
    name: getStringField(payload.name, "name"),
    price: getPriceField(payload.price),
    stock: getStockField(payload.stock),
  };
};

export const validateProductId = (idParam: string | string[]): number => {
  if (Array.isArray(idParam)) {
    throw new ApiError(400, "Product id must be a single value.");
  }

  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Product id must be a positive integer.");
  }

  return id;
};

import { Request, Response } from "express";

import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../services/product.service";
import {
  validateProductId,
  validateProductPayload,
} from "../utils/product-validator";

export const getProducts = async (_req: Request, res: Response): Promise<void> => {
  const products = await getAllProducts();

  res.status(200).json({
    success: true,
    message: "Products fetched successfully.",
    data: products,
    meta: {
      total: products.length,
    },
  });
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  const id = validateProductId(req.params.id);
  const product = await getProductById(id);

  res.status(200).json({
    success: true,
    message: "Product fetched successfully.",
    data: product,
  });
};

export const createProductHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const payload = validateProductPayload(req.body);
  const product = await createProduct(payload);

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    data: product,
  });
};

export const updateProductHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = validateProductId(req.params.id);
  const payload = validateProductPayload(req.body);
  const product = await updateProduct(id, payload);

  res.status(200).json({
    success: true,
    message: "Product updated successfully.",
    data: product,
  });
};

export const deleteProductHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = validateProductId(req.params.id);
  await deleteProduct(id);

  res.status(200).json({
    success: true,
    message: "Product deleted successfully.",
  });
};

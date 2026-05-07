import { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { ProductPayload } from "../utils/product-validator";

const productSelect = {
  id: true,
  name: true,
  price: true,
  stock: true,
} satisfies Prisma.ProductSelect;

type ProductRecord = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

const mapProduct = (product: ProductRecord) => {
  return {
    ...product,
    price: Number(product.price),
  };
};

export const getAllProducts = async () => {
  const products = await prisma.product.findMany({
    select: productSelect,
    orderBy: {
      id: "desc",
    },
  });

  return products.map(mapProduct);
};

export const getProductById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: productSelect,
  });

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  return mapProduct(product);
};

export const createProduct = async (payload: ProductPayload) => {
  const product = await prisma.product.create({
    data: {
      name: payload.name,
      price: new Prisma.Decimal(payload.price),
      stock: payload.stock,
    },
    select: productSelect,
  });

  return mapProduct(product);
};

export const updateProduct = async (id: number, payload: ProductPayload) => {
  await getProductById(id);

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: payload.name,
      price: new Prisma.Decimal(payload.price),
      stock: payload.stock,
    },
    select: productSelect,
  });

  return mapProduct(product);
};

export const deleteProduct = async (id: number) => {
  await getProductById(id);

  await prisma.product.delete({
    where: { id },
  });
};

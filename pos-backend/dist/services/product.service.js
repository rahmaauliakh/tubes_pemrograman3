"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const productSelect = {
    id: true,
    name: true,
    price: true,
    stock: true,
};
const mapProduct = (product) => {
    return {
        ...product,
        price: Number(product.price),
    };
};
const getAllProducts = async () => {
    const products = await prisma_1.prisma.product.findMany({
        select: productSelect,
        orderBy: {
            id: "desc",
        },
    });
    return products.map(mapProduct);
};
exports.getAllProducts = getAllProducts;
const getProductById = async (id) => {
    const product = await prisma_1.prisma.product.findUnique({
        where: { id },
        select: productSelect,
    });
    if (!product) {
        throw new api_error_1.ApiError(404, "Product not found.");
    }
    return mapProduct(product);
};
exports.getProductById = getProductById;
const createProduct = async (payload) => {
    const product = await prisma_1.prisma.product.create({
        data: {
            name: payload.name,
            price: new client_1.Prisma.Decimal(payload.price),
            stock: payload.stock,
        },
        select: productSelect,
    });
    return mapProduct(product);
};
exports.createProduct = createProduct;
const updateProduct = async (id, payload) => {
    await (0, exports.getProductById)(id);
    const product = await prisma_1.prisma.product.update({
        where: { id },
        data: {
            name: payload.name,
            price: new client_1.Prisma.Decimal(payload.price),
            stock: payload.stock,
        },
        select: productSelect,
    });
    return mapProduct(product);
};
exports.updateProduct = updateProduct;
const deleteProduct = async (id) => {
    await (0, exports.getProductById)(id);
    await prisma_1.prisma.product.delete({
        where: { id },
    });
};
exports.deleteProduct = deleteProduct;

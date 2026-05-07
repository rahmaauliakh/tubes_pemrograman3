"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductHandler = exports.updateProductHandler = exports.createProductHandler = exports.getProduct = exports.getProducts = void 0;
const product_service_1 = require("../services/product.service");
const product_validator_1 = require("../utils/product-validator");
const getProducts = async (_req, res) => {
    const products = await (0, product_service_1.getAllProducts)();
    res.status(200).json({
        success: true,
        message: "Products fetched successfully.",
        data: products,
        meta: {
            total: products.length,
        },
    });
};
exports.getProducts = getProducts;
const getProduct = async (req, res) => {
    const id = (0, product_validator_1.validateProductId)(req.params.id);
    const product = await (0, product_service_1.getProductById)(id);
    res.status(200).json({
        success: true,
        message: "Product fetched successfully.",
        data: product,
    });
};
exports.getProduct = getProduct;
const createProductHandler = async (req, res) => {
    const payload = (0, product_validator_1.validateProductPayload)(req.body);
    const product = await (0, product_service_1.createProduct)(payload);
    res.status(201).json({
        success: true,
        message: "Product created successfully.",
        data: product,
    });
};
exports.createProductHandler = createProductHandler;
const updateProductHandler = async (req, res) => {
    const id = (0, product_validator_1.validateProductId)(req.params.id);
    const payload = (0, product_validator_1.validateProductPayload)(req.body);
    const product = await (0, product_service_1.updateProduct)(id, payload);
    res.status(200).json({
        success: true,
        message: "Product updated successfully.",
        data: product,
    });
};
exports.updateProductHandler = updateProductHandler;
const deleteProductHandler = async (req, res) => {
    const id = (0, product_validator_1.validateProductId)(req.params.id);
    await (0, product_service_1.deleteProduct)(id);
    res.status(200).json({
        success: true,
        message: "Product deleted successfully.",
    });
};
exports.deleteProductHandler = deleteProductHandler;

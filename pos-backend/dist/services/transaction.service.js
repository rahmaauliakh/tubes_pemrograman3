"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionById = exports.getAllTransactions = exports.createTransaction = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const transactionListSelect = {
    id: true,
    totalAmount: true,
    paymentStatus: true,
    paymentMethod: true,
    midtransTransactionId: true,
    customerPhone: true,
    createdAt: true,
    cashierId: true,
    cashier: {
        select: {
            id: true,
            username: true,
            role: true,
        },
    },
};
const transactionDetailSelect = {
    ...transactionListSelect,
    items: {
        select: {
            id: true,
            quantity: true,
            price: true,
            subtotal: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    stock: true,
                },
            },
        },
    },
};
const mapTransactionList = (transaction) => {
    return {
        id: transaction.id,
        totalAmount: Number(transaction.totalAmount),
        paymentStatus: transaction.paymentStatus,
        paymentMethod: transaction.paymentMethod,
        midtransTransactionId: transaction.midtransTransactionId,
        customerPhone: transaction.customerPhone,
        createdAt: transaction.createdAt,
        cashierId: transaction.cashierId,
        cashier: {
            id: transaction.cashier.id,
            username: transaction.cashier.username,
            role: transaction.cashier.role,
        },
    };
};
const mapTransactionDetail = (transaction) => {
    return {
        ...mapTransactionList(transaction),
        items: transaction.items.map((item) => {
            return {
                id: item.id,
                quantity: item.quantity,
                price: Number(item.price),
                subtotal: Number(item.subtotal),
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    stock: item.product.stock,
                },
            };
        }),
    };
};
const groupItemsByProduct = (items) => {
    const groupedItems = new Map();
    for (const item of items) {
        const currentQuantity = groupedItems.get(item.productId) ?? 0;
        groupedItems.set(item.productId, currentQuantity + item.quantity);
    }
    return Array.from(groupedItems.entries()).map(([productId, quantity]) => {
        return {
            productId,
            quantity,
        };
    });
};
const getProductsForCheckout = async (tx, items) => {
    const productIds = items.map((item) => item.productId);
    const products = await tx.product.findMany({
        where: {
            id: {
                in: productIds,
            },
        },
        select: {
            id: true,
            name: true,
            price: true,
            stock: true,
        },
    });
    if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((product) => product.id));
        const missingProduct = items.find((item) => !foundIds.has(item.productId));
        throw new api_error_1.ApiError(404, `Product with id ${missingProduct?.productId ?? 0} not found.`);
    }
    return new Map(products.map((product) => [product.id, product]));
};
const createTransaction = async (payload, cashier) => {
    return prisma_1.prisma.$transaction(async (tx) => {
        const groupedItems = groupItemsByProduct(payload.items);
        const productMap = await getProductsForCheckout(tx, groupedItems);
        const transactionItemsData = groupedItems.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new api_error_1.ApiError(404, `Product with id ${item.productId} not found.`);
            }
            if (product.stock < item.quantity) {
                throw new api_error_1.ApiError(400, `Insufficient stock for product ${product.name}.`);
            }
            const subtotal = product.price.mul(item.quantity);
            return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
                subtotal,
            };
        });
        const totalAmount = transactionItemsData.reduce((total, item) => {
            return total.add(item.subtotal);
        }, new client_1.Prisma.Decimal(0));
        const transaction = await tx.transaction.create({
            data: {
                cashierId: cashier.userId,
                totalAmount,
                customerPhone: payload.customerPhone ?? null,
            },
        });
        await tx.transactionItem.createMany({
            data: transactionItemsData.map((item) => {
                return {
                    transactionId: transaction.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                };
            }),
        });
        for (const item of transactionItemsData) {
            await tx.product.update({
                where: {
                    id: item.productId,
                },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            });
        }
        const createdTransaction = await tx.transaction.findUnique({
            where: {
                id: transaction.id,
            },
            select: transactionDetailSelect,
        });
        if (!createdTransaction) {
            throw new api_error_1.ApiError(500, "Failed to create transaction.");
        }
        return mapTransactionDetail(createdTransaction);
    });
};
exports.createTransaction = createTransaction;
const getAllTransactions = async () => {
    const transactions = await prisma_1.prisma.transaction.findMany({
        select: transactionListSelect,
        orderBy: {
            id: "desc",
        },
    });
    return transactions.map(mapTransactionList);
};
exports.getAllTransactions = getAllTransactions;
const getTransactionById = async (id) => {
    const transaction = await prisma_1.prisma.transaction.findUnique({
        where: {
            id,
        },
        select: transactionDetailSelect,
    });
    if (!transaction) {
        throw new api_error_1.ApiError(404, "Transaction not found.");
    }
    return mapTransactionDetail(transaction);
};
exports.getTransactionById = getTransactionById;

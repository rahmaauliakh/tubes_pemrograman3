"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const defaultUsers = [
    {
        username: "admin",
        password: "admin123",
        role: "admin",
    },
    {
        username: "cashier",
        password: "cashier123",
        role: "cashier",
    },
];
const sampleProducts = [
    {
        name: "Indomie",
        price: 3500,
        stock: 100,
    },
    {
        name: "Teh Botol",
        price: 5000,
        stock: 80,
    },
    {
        name: "Aqua",
        price: 3000,
        stock: 120,
    },
    {
        name: "Roti",
        price: 4500,
        stock: 60,
    },
    {
        name: "Kopi",
        price: 7000,
        stock: 40,
    },
];
const seedUsers = async () => {
    for (const user of defaultUsers) {
        const hashedPassword = await bcrypt_1.default.hash(user.password, 10);
        await prisma_1.prisma.user.upsert({
            where: {
                username: user.username,
            },
            update: {
                password: hashedPassword,
                role: user.role,
            },
            create: {
                username: user.username,
                password: hashedPassword,
                role: user.role,
            },
        });
    }
};
const seedProducts = async () => {
    for (const product of sampleProducts) {
        const existingProduct = await prisma_1.prisma.product.findFirst({
            where: {
                name: product.name,
            },
            select: {
                id: true,
            },
        });
        if (existingProduct) {
            await prisma_1.prisma.product.update({
                where: {
                    id: existingProduct.id,
                },
                data: {
                    price: new client_1.Prisma.Decimal(product.price),
                    stock: product.stock,
                },
            });
            continue;
        }
        await prisma_1.prisma.product.create({
            data: {
                name: product.name,
                price: new client_1.Prisma.Decimal(product.price),
                stock: product.stock,
            },
        });
    }
};
const main = async () => {
    await seedUsers();
    await seedProducts();
    console.log("Seed completed successfully.");
    console.log("Default users:");
    console.log("- admin / admin123");
    console.log("- cashier / cashier123");
    console.log("Sample products seeded:");
    console.log("- Indomie");
    console.log("- Teh Botol");
    console.log("- Aqua");
    console.log("- Roti");
    console.log("- Kopi");
};
main()
    .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});

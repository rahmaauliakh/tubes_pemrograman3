"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const parsePort = (value) => {
    if (!value) {
        return 3000;
    }
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new Error("PORT must be a positive integer.");
    }
    return parsedValue;
};
const getRequiredEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`${key} is required in .env`);
    }
    return value;
};
exports.env = {
    PORT: parsePort(process.env.PORT),
    DATABASE_URL: getRequiredEnv("DATABASE_URL"),
    JWT_SECRET: getRequiredEnv("JWT_SECRET"),
};

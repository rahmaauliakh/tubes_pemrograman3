"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwtToken = exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
const userSelect = {
    id: true,
    username: true,
    role: true,
    createdAt: true,
    updatedAt: true,
};
const jwtExpiresIn = "1d";
const mapUser = (user) => {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
        expiresIn: jwtExpiresIn,
    });
};
const registerUser = async (payload) => {
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: {
            username: payload.username,
        },
        select: {
            id: true,
        },
    });
    if (existingUser) {
        throw new api_error_1.ApiError(409, "Username already exists.");
    }
    const hashedPassword = await bcrypt_1.default.hash(payload.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            username: payload.username,
            password: hashedPassword,
            role: payload.role,
        },
        select: userSelect,
    });
    const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
    });
    return {
        user: mapUser(user),
        token,
    };
};
exports.registerUser = registerUser;
const loginUser = async (payload) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            username: payload.username,
        },
        select: {
            ...userSelect,
            password: true,
        },
    });
    if (!user) {
        throw new api_error_1.ApiError(401, "Invalid username or password.");
    }
    const isPasswordValid = await bcrypt_1.default.compare(payload.password, user.password);
    if (!isPasswordValid) {
        throw new api_error_1.ApiError(401, "Invalid username or password.");
    }
    const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
    });
    return {
        user: mapUser(user),
        token,
    };
};
exports.loginUser = loginUser;
const verifyJwtToken = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
    if (typeof decoded !== "object" || decoded === null) {
        throw new api_error_1.ApiError(401, "Invalid token.");
    }
    const userId = decoded.userId;
    const username = decoded.username;
    const role = decoded.role;
    if (typeof userId !== "number" ||
        typeof username !== "string" ||
        (role !== "admin" && role !== "cashier")) {
        throw new api_error_1.ApiError(401, "Invalid token payload.");
    }
    return {
        userId,
        username,
        role,
    };
};
exports.verifyJwtToken = verifyJwtToken;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.snap = void 0;
const midtrans_client_1 = __importDefault(require("midtrans-client"));
const env_1 = require("./env");
exports.snap = new midtrans_client_1.default.Snap({
    isProduction: env_1.env.MIDTRANS_IS_PRODUCTION,
    serverKey: env_1.env.MIDTRANS_SERVER_KEY,
    clientKey: env_1.env.MIDTRANS_CLIENT_KEY,
});

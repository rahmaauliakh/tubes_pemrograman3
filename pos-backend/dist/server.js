"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const pos_server_1 = require("./grpc/pos-server");
const rabbitmq_1 = require("./messaging/rabbitmq");
const PORT = env_1.env.PORT;
const grpcServer = (0, pos_server_1.startGrpcServer)();
const httpServer = app_1.default.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
const shutdown = async () => {
    httpServer.close();
    grpcServer.tryShutdown(async () => {
        await (0, rabbitmq_1.closeRabbitMQ)();
        process.exit(0);
    });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

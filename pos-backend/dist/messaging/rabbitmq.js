"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRabbitMQ = exports.publishEvent = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const env_1 = require("../config/env");
let connection = null;
let channel = null;
let connectPromise = null;
const connectRabbitMQ = async () => {
    if (channel) {
        return channel;
    }
    if (connectPromise) {
        return connectPromise;
    }
    connectPromise = (async () => {
        try {
            connection = await amqplib_1.default.connect(env_1.env.RABBITMQ_URL);
            channel = await connection.createChannel();
            await channel.assertExchange(env_1.env.RABBITMQ_EXCHANGE, "topic", {
                durable: true,
            });
            connection.on("close", () => {
                connection = null;
                channel = null;
                connectPromise = null;
            });
            connection.on("error", (error) => {
                console.error("RabbitMQ connection error:", error);
            });
            return channel;
        }
        catch (error) {
            console.error("RabbitMQ connection failed:", error);
            connection = null;
            channel = null;
            connectPromise = null;
            return null;
        }
    })();
    return connectPromise;
};
const publishEvent = async (routingKey, payload) => {
    const activeChannel = await connectRabbitMQ();
    if (!activeChannel) {
        return;
    }
    const event = {
        routingKey,
        occurredAt: new Date().toISOString(),
        payload,
    };
    activeChannel.publish(env_1.env.RABBITMQ_EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)), {
        contentType: "application/json",
        persistent: true,
    });
};
exports.publishEvent = publishEvent;
const closeRabbitMQ = async () => {
    await channel?.close();
    await connection?.close();
    channel = null;
    connection = null;
    connectPromise = null;
};
exports.closeRabbitMQ = closeRabbitMQ;

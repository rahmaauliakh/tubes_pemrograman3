import amqp, { Channel, ChannelModel } from "amqplib";

import { env } from "../config/env";

type EventPayload = Record<string, unknown>;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connectPromise: Promise<Channel | null> | null = null;

const connectRabbitMQ = async (): Promise<Channel | null> => {
  if (channel) {
    return channel;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      connection = await amqp.connect(env.RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertExchange(env.RABBITMQ_EXCHANGE, "topic", {
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
    } catch (error: unknown) {
      console.error("RabbitMQ connection failed:", error);
      connection = null;
      channel = null;
      connectPromise = null;
      return null;
    }
  })();

  return connectPromise;
};

export const publishEvent = async (
  routingKey: string,
  payload: EventPayload
): Promise<void> => {
  const activeChannel = await connectRabbitMQ();

  if (!activeChannel) {
    return;
  }

  const event = {
    routingKey,
    occurredAt: new Date().toISOString(),
    payload,
  };

  activeChannel.publish(
    env.RABBITMQ_EXCHANGE,
    routingKey,
    Buffer.from(JSON.stringify(event)),
    {
      contentType: "application/json",
      persistent: true,
    }
  );
};

export const closeRabbitMQ = async (): Promise<void> => {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
  connectPromise = null;
};

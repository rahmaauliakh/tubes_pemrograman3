import app from "./app";
import { env } from "./config/env";
import { startGrpcServer } from "./grpc/pos-server";
import { closeRabbitMQ } from "./messaging/rabbitmq";

const PORT = env.PORT;
const grpcServer = startGrpcServer();

const httpServer = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const shutdown = async () => {
  httpServer.close();
  grpcServer.tryShutdown(async () => {
    await closeRabbitMQ();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

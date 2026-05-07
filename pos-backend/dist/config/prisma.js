"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
const client_1 = require("@prisma/client");
const env_1 = require("./env");
const connectionUrl = new URL(env_1.env.DATABASE_URL);
const databaseName = connectionUrl.pathname.replace(/^\//, "");
if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name.");
}
const adapter = new adapter_mariadb_1.PrismaMariaDb({
    host: connectionUrl.hostname,
    port: Number(connectionUrl.port || 3306),
    user: decodeURIComponent(connectionUrl.username),
    password: decodeURIComponent(connectionUrl.password),
    database: databaseName,
    connectionLimit: 5,
});
exports.prisma = new client_1.PrismaClient({
    adapter,
});

require("dotenv/config");
const { defineConfig, env } = require("prisma/config");

module.exports = defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "npm run seed",
    },
    datasource: {
        url: env("DATABASE_URL"),
    },
});

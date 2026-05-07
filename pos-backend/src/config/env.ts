const parsePort = (value: string | undefined): number => {
  if (!value) {
    return 3000;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsedValue;
};

const getRequiredEnv = (key: "DATABASE_URL" | "JWT_SECRET"): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required in .env`);
  }

  return value;
};

export const env = {
  PORT: parsePort(process.env.PORT),
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  JWT_SECRET: getRequiredEnv("JWT_SECRET"),
};

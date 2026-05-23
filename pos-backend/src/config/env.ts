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

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) {
    return defaultValue;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new Error("Boolean environment value must be true or false.");
};

const getRequiredEnv = (
  key: "DATABASE_URL" | "JWT_SECRET" | "MIDTRANS_SERVER_KEY" | "MIDTRANS_CLIENT_KEY"
): string => {
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
  MIDTRANS_SERVER_KEY: getRequiredEnv("MIDTRANS_SERVER_KEY"),
  MIDTRANS_CLIENT_KEY: getRequiredEnv("MIDTRANS_CLIENT_KEY"),
  MIDTRANS_IS_PRODUCTION: parseBoolean(process.env.MIDTRANS_IS_PRODUCTION, false),
};

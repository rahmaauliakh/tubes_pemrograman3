import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { Prisma } from "@prisma/client";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import {
  LoginPayload,
  RegisterPayload,
  Role,
} from "../utils/auth-validator";

const userSelect = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const jwtExpiresIn: SignOptions["expiresIn"] = "1d";

type UserRecord = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

type LoginUserRecord = Prisma.UserGetPayload<{
  select: typeof userSelect & { password: true };
}>;

type AuthTokenPayload = {
  userId: number;
  username: string;
  role: Role;
};

const mapUser = (user: UserRecord) => {
  return {
    id: user.id,
    username: user.username,
    role: user.role as Role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const generateToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: jwtExpiresIn,
  });
};

export const registerUser = async (payload: RegisterPayload) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      username: payload.username,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new ApiError(409, "Username already exists.");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const user = await prisma.user.create({
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
    role: user.role as Role,
  });

  return {
    user: mapUser(user),
    token,
  };
};

export const loginUser = async (payload: LoginPayload) => {
  const user = await prisma.user.findUnique({
    where: {
      username: payload.username,
    },
    select: {
      ...userSelect,
      password: true,
    },
  });

  if (!user) {
    throw new ApiError(401, "Invalid username or password.");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid username or password.");
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role as Role,
  });

  return {
    user: mapUser(user as LoginUserRecord),
    token,
  };
};

export const verifyJwtToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded !== "object" || decoded === null) {
    throw new ApiError(401, "Invalid token.");
  }

  const userId = decoded.userId;
  const username = decoded.username;
  const role = decoded.role;

  if (
    typeof userId !== "number" ||
    typeof username !== "string" ||
    (role !== "admin" && role !== "cashier")
  ) {
    throw new ApiError(401, "Invalid token payload.");
  }

  return {
    userId,
    username,
    role,
  };
};

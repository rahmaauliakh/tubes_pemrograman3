import { Request, Response } from "express";

import { loginUser, registerUser } from "../services/auth.service";
import {
  validateLoginPayload,
  validateRegisterPayload,
} from "../utils/auth-validator";

export const registerHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const payload = validateRegisterPayload(req.body);
  const result = await registerUser(payload);

  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: result,
  });
};

export const loginHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const payload = validateLoginPayload(req.body);
  const result = await loginUser(payload);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: result,
  });
};

import { Role } from "../utils/auth-validator";

declare global {
  namespace Express {
    interface UserPayload {
      userId: number;
      username: string;
      role: Role;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};

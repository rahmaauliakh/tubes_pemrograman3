import { Router } from "express";
import { Request, Response } from "express";

import { loginHandler, registerHandler } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/async-handler";

const authRouter = Router();

const methodNotAllowed = (
  req: Request,
  res: Response,
  allowedMethod: "POST"
): void => {
  res.status(405).json({
    success: false,
    message: `Method ${req.method} not allowed.`,
    error: {
      path: req.originalUrl,
      allowedMethod,
    },
    example: {
      method: allowedMethod,
      path: req.baseUrl + req.path,
    },
  });
};

authRouter.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth route is available.",
    data: {
      endpoints: [
        {
          method: "POST",
          path: "/api/auth/register",
        },
        {
          method: "POST",
          path: "/api/auth/login",
        },
      ],
    },
  });
});

authRouter.post("/register", asyncHandler(registerHandler));
authRouter.all("/register", (req, res) => {
  methodNotAllowed(req, res, "POST");
});

authRouter.post("/login", asyncHandler(loginHandler));
authRouter.all("/login", (req, res) => {
  methodNotAllowed(req, res, "POST");
});

export default authRouter;

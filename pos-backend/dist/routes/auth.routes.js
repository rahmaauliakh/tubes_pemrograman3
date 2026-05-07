"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const async_handler_1 = require("../utils/async-handler");
const authRouter = (0, express_1.Router)();
const methodNotAllowed = (req, res, allowedMethod) => {
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
authRouter.post("/register", (0, async_handler_1.asyncHandler)(auth_controller_1.registerHandler));
authRouter.all("/register", (req, res) => {
    methodNotAllowed(req, res, "POST");
});
authRouter.post("/login", (0, async_handler_1.asyncHandler)(auth_controller_1.loginHandler));
authRouter.all("/login", (req, res) => {
    methodNotAllowed(req, res, "POST");
});
exports.default = authRouter;

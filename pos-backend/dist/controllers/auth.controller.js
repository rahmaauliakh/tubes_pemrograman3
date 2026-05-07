"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginHandler = exports.registerHandler = void 0;
const auth_service_1 = require("../services/auth.service");
const auth_validator_1 = require("../utils/auth-validator");
const registerHandler = async (req, res) => {
    const payload = (0, auth_validator_1.validateRegisterPayload)(req.body);
    const result = await (0, auth_service_1.registerUser)(payload);
    res.status(201).json({
        success: true,
        message: "User registered successfully.",
        data: result,
    });
};
exports.registerHandler = registerHandler;
const loginHandler = async (req, res) => {
    const payload = (0, auth_validator_1.validateLoginPayload)(req.body);
    const result = await (0, auth_service_1.loginUser)(payload);
    res.status(200).json({
        success: true,
        message: "Login successful.",
        data: result,
    });
};
exports.loginHandler = loginHandler;

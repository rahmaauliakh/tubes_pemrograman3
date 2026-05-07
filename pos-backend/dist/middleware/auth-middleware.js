"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = exports.adminOnly = exports.verifyToken = void 0;
const auth_service_1 = require("../services/auth.service");
const api_error_1 = require("../utils/api-error");
const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        throw new api_error_1.ApiError(401, "Authorization header is required.");
    }
    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        throw new api_error_1.ApiError(401, "Invalid authorization format.");
    }
    return token;
};
const verifyToken = (req, _res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    const decodedUser = (0, auth_service_1.verifyJwtToken)(token);
    req.user = decodedUser;
    next();
};
exports.verifyToken = verifyToken;
const adminOnly = (req, _res, next) => {
    if (!req.user) {
        throw new api_error_1.ApiError(401, "Unauthorized.");
    }
    if (req.user.role !== "admin") {
        throw new api_error_1.ApiError(403, "Access denied. Admin only.");
    }
    next();
};
exports.adminOnly = adminOnly;
const roleMiddleware = (allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            throw new api_error_1.ApiError(401, "Unauthorized.");
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw new api_error_1.ApiError(403, "Access denied. Insufficient role.");
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const serverUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
exports.swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "POS API",
            version: "1.0.0",
            description: "API documentation for POS backend services.",
        },
        servers: [
            {
                url: serverUrl,
                description: "Current server",
            },
        ],
        tags: [
            { name: "Health" },
            { name: "Auth" },
            { name: "Products" },
            { name: "Transactions" },
            { name: "Payments" },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            parameters: {
                ProductId: {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "integer",
                        minimum: 1,
                    },
                    example: 1,
                },
                TransactionId: {
                    name: "transactionId",
                    in: "path",
                    required: true,
                    schema: {
                        type: "integer",
                        minimum: 1,
                    },
                    example: 1,
                },
            },
            schemas: {
                ApiError: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: { type: "string", example: "Validation error." },
                        error: {
                            type: "object",
                            additionalProperties: true,
                        },
                    },
                },
                AuthResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Login successful." },
                        data: {
                            type: "object",
                            properties: {
                                user: { $ref: "#/components/schemas/User" },
                                token: {
                                    type: "string",
                                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                },
                            },
                        },
                    },
                },
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        username: { type: "string", example: "cashier01" },
                        role: { type: "string", enum: ["admin", "cashier"], example: "cashier" },
                    },
                },
                RegisterRequest: {
                    type: "object",
                    required: ["username", "password"],
                    properties: {
                        username: { type: "string", minLength: 3, example: "cashier01" },
                        password: { type: "string", minLength: 6, example: "secret123" },
                        role: { type: "string", enum: ["admin", "cashier"], default: "cashier" },
                    },
                },
                LoginRequest: {
                    type: "object",
                    required: ["username", "password"],
                    properties: {
                        username: { type: "string", minLength: 3, example: "cashier01" },
                        password: { type: "string", minLength: 6, example: "secret123" },
                    },
                },
                ProductRequest: {
                    type: "object",
                    required: ["name", "price", "stock"],
                    properties: {
                        name: { type: "string", example: "Americano" },
                        price: { type: "number", minimum: 0, example: 18000 },
                        stock: { type: "integer", minimum: 0, example: 25 },
                    },
                },
                Product: {
                    allOf: [
                        {
                            type: "object",
                            properties: {
                                id: { type: "integer", example: 1 },
                            },
                        },
                        { $ref: "#/components/schemas/ProductRequest" },
                    ],
                },
                TransactionItemRequest: {
                    type: "object",
                    required: ["productId", "quantity"],
                    properties: {
                        productId: { type: "integer", minimum: 1, example: 1 },
                        quantity: { type: "integer", minimum: 1, example: 2 },
                    },
                },
                CreateTransactionRequest: {
                    type: "object",
                    required: ["items"],
                    properties: {
                        items: {
                            type: "array",
                            minItems: 1,
                            items: { $ref: "#/components/schemas/TransactionItemRequest" },
                        },
                        customerPhone: { type: "string", example: "081234567890" },
                    },
                },
                MidtransWebhookRequest: {
                    type: "object",
                    required: [
                        "order_id",
                        "status_code",
                        "gross_amount",
                        "signature_key",
                        "transaction_status",
                    ],
                    properties: {
                        order_id: { type: "string", example: "TRX-1" },
                        status_code: { type: "string", example: "200" },
                        gross_amount: { type: "string", example: "36000.00" },
                        signature_key: { type: "string", example: "generated-signature" },
                        transaction_status: { type: "string", example: "settlement" },
                        payment_type: { type: "string", example: "qris" },
                        transaction_id: { type: "string", example: "midtrans-transaction-id" },
                        fraud_status: { type: "string", example: "accept" },
                    },
                },
            },
            responses: {
                UnauthorizedError: {
                    description: "Unauthorized or invalid token.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiError" },
                        },
                    },
                },
                ValidationError: {
                    description: "Validation error.",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApiError" },
                        },
                    },
                },
            },
        },
        paths: {
            "/": {
                get: {
                    tags: ["Health"],
                    summary: "Check API status",
                    responses: {
                        "200": {
                            description: "API is running.",
                        },
                    },
                },
            },
            "/api/auth": {
                get: {
                    tags: ["Auth"],
                    summary: "List auth endpoints",
                    responses: {
                        "200": {
                            description: "Auth route information.",
                        },
                    },
                },
            },
            "/api/auth/register": {
                post: {
                    tags: ["Auth"],
                    summary: "Register a user",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RegisterRequest" },
                            },
                        },
                    },
                    responses: {
                        "201": {
                            description: "User registered.",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/AuthResponse" },
                                },
                            },
                        },
                        "400": { $ref: "#/components/responses/ValidationError" },
                    },
                },
            },
            "/api/auth/login": {
                post: {
                    tags: ["Auth"],
                    summary: "Login a user",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LoginRequest" },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Login successful.",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/AuthResponse" },
                                },
                            },
                        },
                        "400": { $ref: "#/components/responses/ValidationError" },
                    },
                },
            },
            "/api/products": {
                get: {
                    tags: ["Products"],
                    summary: "Get products",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": { description: "Products retrieved." },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
                post: {
                    tags: ["Products"],
                    summary: "Create a product",
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductRequest" },
                            },
                        },
                    },
                    responses: {
                        "201": { description: "Product created." },
                        "400": { $ref: "#/components/responses/ValidationError" },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
            },
            "/api/products/{id}": {
                get: {
                    tags: ["Products"],
                    summary: "Get a product by id",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: "#/components/parameters/ProductId" }],
                    responses: {
                        "200": { description: "Product retrieved." },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                        "404": { description: "Product not found." },
                    },
                },
                put: {
                    tags: ["Products"],
                    summary: "Update a product",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: "#/components/parameters/ProductId" }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductRequest" },
                            },
                        },
                    },
                    responses: {
                        "200": { description: "Product updated." },
                        "400": { $ref: "#/components/responses/ValidationError" },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                        "404": { description: "Product not found." },
                    },
                },
                delete: {
                    tags: ["Products"],
                    summary: "Delete a product",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: "#/components/parameters/ProductId" }],
                    responses: {
                        "200": { description: "Product deleted." },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                        "404": { description: "Product not found." },
                    },
                },
            },
            "/api/transactions": {
                get: {
                    tags: ["Transactions"],
                    summary: "Get transactions",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": { description: "Transactions retrieved." },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
                post: {
                    tags: ["Transactions"],
                    summary: "Create a transaction",
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CreateTransactionRequest" },
                            },
                        },
                    },
                    responses: {
                        "201": { description: "Transaction created." },
                        "400": { $ref: "#/components/responses/ValidationError" },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
            },
            "/api/transactions/{id}": {
                get: {
                    tags: ["Transactions"],
                    summary: "Get a transaction by id",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: "#/components/parameters/TransactionId" }],
                    responses: {
                        "200": { description: "Transaction retrieved." },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                        "404": { description: "Transaction not found." },
                    },
                },
            },
            "/api/payments/webhook": {
                post: {
                    tags: ["Payments"],
                    summary: "Receive Midtrans webhook",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/MidtransWebhookRequest" },
                            },
                        },
                    },
                    responses: {
                        "200": { description: "Webhook processed." },
                        "400": { $ref: "#/components/responses/ValidationError" },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
            },
            "/api/payments/create/{transactionId}": {
                post: {
                    tags: ["Payments"],
                    summary: "Create a Midtrans payment",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: "#/components/parameters/TransactionId" }],
                    responses: {
                        "201": { description: "Payment created." },
                        "400": { $ref: "#/components/responses/ValidationError" },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
            },
            "/api/payments/status/{transactionId}": {
                get: {
                    tags: ["Payments"],
                    summary: "Check payment status",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: "#/components/parameters/TransactionId" }],
                    responses: {
                        "200": { description: "Payment status retrieved." },
                        "400": { $ref: "#/components/responses/ValidationError" },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
            },
            "/api/payments/retry/{transactionId}": {
                post: {
                    tags: ["Payments"],
                    summary: "Retry a Midtrans payment",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ $ref: "#/components/parameters/TransactionId" }],
                    responses: {
                        "201": { description: "Payment retried." },
                        "400": { $ref: "#/components/responses/ValidationError" },
                        "401": { $ref: "#/components/responses/UnauthorizedError" },
                    },
                },
            },
        },
    },
    apis: [],
});

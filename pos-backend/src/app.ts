import express from "express";
import cors from "cors";
import "dotenv/config";

import authRouter from "./routes/auth.routes";
import productRouter from "./routes/product.routes";
import transactionRouter from "./routes/transaction.routes";
import { errorHandler, notFoundHandler } from "./middleware/error-middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "POS API Running"
  });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/transactions", transactionRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

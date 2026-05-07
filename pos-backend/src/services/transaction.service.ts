import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { CreateTransactionPayload } from "../utils/transaction-validator";
import { Role } from "../utils/auth-validator";

const transactionListSelect = {
  id: true,
  totalAmount: true,
  createdAt: true,
  cashierId: true,
  cashier: {
    select: {
      id: true,
      username: true,
      role: true,
    },
  },
} satisfies Prisma.TransactionSelect;

const transactionDetailSelect = {
  ...transactionListSelect,
  items: {
    select: {
      id: true,
      quantity: true,
      price: true,
      subtotal: true,
      product: {
        select: {
          id: true,
          name: true,
          stock: true,
        },
      },
    },
  },
} satisfies Prisma.TransactionSelect;

type TransactionListRecord = Prisma.TransactionGetPayload<{
  select: typeof transactionListSelect;
}>;

type TransactionDetailRecord = Prisma.TransactionGetPayload<{
  select: typeof transactionDetailSelect;
}>;

type ProductForCheckout = {
  id: number;
  name: string;
  price: Prisma.Decimal;
  stock: number;
};

type GroupedItem = {
  productId: number;
  quantity: number;
};

type CashierPayload = {
  userId: number;
  username: string;
  role: Role;
};

const mapTransactionList = (transaction: TransactionListRecord) => {
  return {
    id: transaction.id,
    totalAmount: Number(transaction.totalAmount),
    createdAt: transaction.createdAt,
    cashierId: transaction.cashierId,
    cashier: {
      id: transaction.cashier.id,
      username: transaction.cashier.username,
      role: transaction.cashier.role as Role,
    },
  };
};

const mapTransactionDetail = (transaction: TransactionDetailRecord) => {
  return {
    ...mapTransactionList(transaction),
    items: transaction.items.map((item) => {
      return {
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        product: {
          id: item.product.id,
          name: item.product.name,
          stock: item.product.stock,
        },
      };
    }),
  };
};

const groupItemsByProduct = (items: CreateTransactionPayload["items"]): GroupedItem[] => {
  const groupedItems = new Map<number, number>();

  for (const item of items) {
    const currentQuantity = groupedItems.get(item.productId) ?? 0;
    groupedItems.set(item.productId, currentQuantity + item.quantity);
  }

  return Array.from(groupedItems.entries()).map(([productId, quantity]) => {
    return {
      productId,
      quantity,
    };
  });
};

const getProductsForCheckout = async (
  tx: PrismaClient | Prisma.TransactionClient,
  items: GroupedItem[]
): Promise<Map<number, ProductForCheckout>> => {
  const productIds = items.map((item) => item.productId);

  const products = await tx.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
    },
  });

  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((product) => product.id));
    const missingProduct = items.find((item) => !foundIds.has(item.productId));

    throw new ApiError(404, `Product with id ${missingProduct?.productId ?? 0} not found.`);
  }

  return new Map(products.map((product) => [product.id, product]));
};

export const createTransaction = async (
  payload: CreateTransactionPayload,
  cashier: CashierPayload
) => {
  return prisma.$transaction(async (tx) => {
    const groupedItems = groupItemsByProduct(payload.items);
    const productMap = await getProductsForCheckout(tx, groupedItems);

    const transactionItemsData = groupedItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new ApiError(404, `Product with id ${item.productId} not found.`);
      }

      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product ${product.name}.`);
      }

      const subtotal = product.price.mul(item.quantity);

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        subtotal,
      };
    });

    const totalAmount = transactionItemsData.reduce((total, item) => {
      return total.add(item.subtotal);
    }, new Prisma.Decimal(0));

    const transaction = await tx.transaction.create({
      data: {
        cashierId: cashier.userId,
        totalAmount,
      },
    });

    await tx.transactionItem.createMany({
      data: transactionItemsData.map((item) => {
        return {
          transactionId: transaction.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        };
      }),
    });

    for (const item of transactionItemsData) {
      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    const createdTransaction = await tx.transaction.findUnique({
      where: {
        id: transaction.id,
      },
      select: transactionDetailSelect,
    });

    if (!createdTransaction) {
      throw new ApiError(500, "Failed to create transaction.");
    }

    return mapTransactionDetail(createdTransaction);
  });
};

export const getAllTransactions = async () => {
  const transactions = await prisma.transaction.findMany({
    select: transactionListSelect,
    orderBy: {
      id: "desc",
    },
  });

  return transactions.map(mapTransactionList);
};

export const getTransactionById = async (id: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id,
    },
    select: transactionDetailSelect,
  });

  if (!transaction) {
    throw new ApiError(404, "Transaction not found.");
  }

  return mapTransactionDetail(transaction);
};

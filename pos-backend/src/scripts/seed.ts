import "dotenv/config";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

type SeedUser = {
  username: string;
  password: string;
  role: "admin" | "cashier";
};

type SeedProduct = {
  name: string;
  price: number;
  stock: number;
};

const defaultUsers: SeedUser[] = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
  },
  {
    username: "cashier",
    password: "cashier123",
    role: "cashier",
  },
];

const sampleProducts: SeedProduct[] = [
  {
    name: "Indomie",
    price: 3500,
    stock: 100,
  },
  {
    name: "Teh Botol",
    price: 5000,
    stock: 80,
  },
  {
    name: "Aqua",
    price: 3000,
    stock: 120,
  },
  {
    name: "Roti",
    price: 4500,
    stock: 60,
  },
  {
    name: "Kopi",
    price: 7000,
    stock: 40,
  },
];

const seedUsers = async (): Promise<void> => {
  for (const user of defaultUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: {
        username: user.username,
      },
      update: {
        password: hashedPassword,
        role: user.role,
      },
      create: {
        username: user.username,
        password: hashedPassword,
        role: user.role,
      },
    });
  }
};

const seedProducts = async (): Promise<void> => {
  for (const product of sampleProducts) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        name: product.name,
      },
      select: {
        id: true,
      },
    });

    if (existingProduct) {
      await prisma.product.update({
        where: {
          id: existingProduct.id,
        },
        data: {
          price: new Prisma.Decimal(product.price),
          stock: product.stock,
        },
      });

      continue;
    }

    await prisma.product.create({
      data: {
        name: product.name,
        price: new Prisma.Decimal(product.price),
        stock: product.stock,
      },
    });
  }
};

const main = async (): Promise<void> => {
  await seedUsers();
  await seedProducts();

  console.log("Seed completed successfully.");
  console.log("Default users:");
  console.log("- admin / admin123");
  console.log("- cashier / cashier123");
  console.log("Sample products seeded:");
  console.log("- Indomie");
  console.log("- Teh Botol");
  console.log("- Aqua");
  console.log("- Roti");
  console.log("- Kopi");
};

main()
  .catch((error: unknown) => {
    console.error("Seed failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

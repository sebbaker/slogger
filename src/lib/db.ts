import { PrismaClient } from "@prisma/client";

declare global {
  var __sloggerPrisma: PrismaClient | undefined;
}

export const db = global.__sloggerPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__sloggerPrisma = db;
}

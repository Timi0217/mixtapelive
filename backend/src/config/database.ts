import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  prismaClient = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prismaClient = global.__prisma;
}

const prisma = prismaClient as unknown as any;

export { prisma, prismaClient };

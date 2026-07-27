import { PrismaClient } from '@prisma/client';

/** Instância única do Prisma Client compartilhada pela aplicação. */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

import { PrismaClient } from '@prisma/client'

// Globálna premenná pre Prisma client v development mode
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Singleton pattern pre Prisma client
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

// V development mode použijeme globálnu premennú
// aby sme predišli vytváraniu viacerých inštancií pri hot reload
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

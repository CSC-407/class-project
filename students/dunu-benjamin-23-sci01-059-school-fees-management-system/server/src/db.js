import { PrismaClient } from '@prisma/client'

// Prisma sends every query as a parameterised statement, so user input is never
// concatenated into SQL.
export const prisma = new PrismaClient()

import type { User as PrismaUser } from '@prisma/client'

declare global {
  type User = PrismaUser
}
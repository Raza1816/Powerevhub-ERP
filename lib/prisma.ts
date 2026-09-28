import { PrismaClient } from '@prisma/client'

// Normalize SQLite DATABASE_URL to an absolute path pointing to prisma/dev.db
export function getResolvedDatabaseUrl(): string {
  if (typeof window !== 'undefined') {
    return ''
  }
  const existing = process.env.DATABASE_URL
  if (existing && !existing.startsWith('file:.')) {
    return existing
  }
  try {
    const nodePath = eval('require')('path')
    const nodeFs = eval('require')('fs')
    const prismaDir = nodePath.resolve(process.cwd(), 'prisma')
    if (!nodeFs.existsSync(prismaDir)) {
      nodeFs.mkdirSync(prismaDir, { recursive: true })
    }
    const dbPath = nodePath.resolve(prismaDir, 'dev.db')
    return `file:${dbPath}`
  } catch {
    return process.env.DATABASE_URL || 'file:./prisma/dev.db'
  }
}

const resolvedDbUrl = typeof window === 'undefined' ? getResolvedDatabaseUrl() : ''
if (typeof window === 'undefined' && resolvedDbUrl) {
  process.env.DATABASE_URL = resolvedDbUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  (globalForPrisma.prisma && (globalForPrisma.prisma as any).user)
    ? globalForPrisma.prisma
    : typeof window === 'undefined'
      ? new PrismaClient({
          datasources: resolvedDbUrl
            ? {
                db: {
                  url: resolvedDbUrl,
                },
              }
            : undefined,
          log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        })
      : (null as unknown as PrismaClient)

if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  globalForPrisma.prisma = prisma
}

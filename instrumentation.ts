export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDatabase, seedStaticUsers } = await import('./lib/init-db')
    const { prisma } = await import('./lib/prisma')

    // 1. Initialize schema and missing tables non-destructively
    await initDatabase()

    // 2. Strictly ensure accounts are only seeded if database has 0 users
    try {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        console.log('[instrumentation] prisma.user.count() is 0. Seeding initial accounts...')
        await seedStaticUsers()
      } else {
        console.log(`[instrumentation] Existing users found (count: ${userCount}). Skipping account seeding to preserve data.`)
      }
    } catch (err: any) {
      console.warn('[instrumentation] Notice checking user table:', err?.message || err)
    }
  }
}

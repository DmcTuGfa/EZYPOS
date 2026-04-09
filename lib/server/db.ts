
import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __ventamxPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('DATABASE_URL no configurada. Configúrala en Railway para usar Neon.')
}

export const pool = global.__ventamxPool || new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
})

if (process.env.NODE_ENV !== 'production') {
  global.__ventamxPool = pool
}

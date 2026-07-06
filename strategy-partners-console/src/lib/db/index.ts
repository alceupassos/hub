import 'server-only'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Single pooled Drizzle client for the isolated `strategy_partners` schema.
// DATABASE_URL points at the VPS Postgres (same instance as semantix, different schema).
//
// The pool + client are created LAZILY on first real use — never at module import — so that
// importing this module during `next build` (or when DATABASE_URL is unset) does not throw.
// Callers must gate on isDbConfigured() before touching `db`.

declare global {
  // eslint-disable-next-line no-var
  var __sp_pool: Pool | undefined
}

let _pool: Pool | undefined
let _db: NodePgDatabase<typeof schema> | undefined

function getPool(): Pool {
  if (_pool) return _pool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada — camada de dados do console indisponível.')
  }
  _pool = globalThis.__sp_pool ?? new Pool({ connectionString, max: 10 })
  if (process.env.NODE_ENV !== 'production') globalThis.__sp_pool = _pool
  return _pool
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) _db = drizzle(getPool(), { schema })
  return _db
}

/** Lazy proxy: initializes the pool/client on first property access, not at import. */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb()
    const value = Reflect.get(instance as object, prop, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

/** True when a database connection is configured — lets routes degrade gracefully. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export { schema }

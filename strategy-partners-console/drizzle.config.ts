import type { Config } from 'drizzle-kit'

// Drizzle Kit config for the isolated `strategy_partners` schema.
// `schemaFilter` guarantees the CLI only ever introspects/manages this schema —
// it will never read, diff, or drop anything in the sibling `semantix` schema on the
// same Postgres instance.
//
// `generate` works without a live DB. For `push`/`migrate`, run with DATABASE_URL set, e.g.:
//   DATABASE_URL="postgresql://user:pass@host:5432/db" npx drizzle-kit push
export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  schemaFilter: ['strategy_partners'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
  verbose: true,
  strict: true,
} satisfies Config

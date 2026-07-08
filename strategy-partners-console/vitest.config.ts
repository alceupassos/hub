import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` lança fora do bundler RSC; no teste (Node) vira no-op.
      'server-only': fileURLToPath(new URL('./src/lib/server/__tests__/server-only-stub.ts', import.meta.url)),
    },
  },
})

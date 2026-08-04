import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// `.mts` extension is mandatory: package.json has no "type": "module", so a plain
// `.ts` config file would be loaded as CommonJS by Vite and emit an ESM-syntax-in-CJS
// warning. `.mts` forces ESM loading regardless of the package.json "type" field.
export default defineConfig({
  resolve: {
    alias: {
      // The real `server-only` package throws unconditionally on import (see
      // src/test/server-only-stub.ts). Vitest does not apply the `react-server`
      // resolution condition, and `resolve.conditions` was verified during planning
      // to NOT prevent the throw — only `resolve.alias` works here.
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

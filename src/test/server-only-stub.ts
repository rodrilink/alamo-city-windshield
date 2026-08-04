// Test-only replacement for the real `server-only` package.
// The real package's default entry point (`node_modules/server-only/index.js`) is a
// bare `throw new Error(...)` intended to fail the build if a Client Component ever
// imports a server-only module. Vitest does not apply Next.js's `react-server`
// resolution condition, so importing the real package under test would throw
// unconditionally. This stub is aliased in place of `server-only` in
// `vitest.config.mts` so server modules can be unit-tested without that crash.
export {}

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  noExternal: ['@board-games/shared', 'drizzle-orm'],
  external: ['better-sqlite3'],
});

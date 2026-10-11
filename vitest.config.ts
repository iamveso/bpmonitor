import { defineConfig } from 'vitest/config'

// Standalone test config so the app's Vite plugins (Start, Nitro, Solid,
// Tailwind) are not loaded while running the pure-logic unit tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

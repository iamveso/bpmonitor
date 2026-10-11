import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SERVER_URL: z.url().optional(),
    // SQLite via libSQL. `file:local.db` for local-only work;
    // `libsql://...turso.io` + token in production.
    TURSO_DATABASE_URL: z.string().min(1).default('file:local.db'),
    TURSO_AUTH_TOKEN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url().optional(),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
  },

  /**
   * What object holds the environment variables at runtime. During SSR/build
   * `process.env` holds server vars (from .env files / Vercel); in the browser
   * only `import.meta.env` with the VITE_ prefix is available.
   */
  runtimeEnv: {
    ...import.meta.env,
    ...(typeof process !== 'undefined' ? process.env : {}),
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in a ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
})

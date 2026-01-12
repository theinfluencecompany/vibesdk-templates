import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-only environment variables.
   *
   * Keep optional in the template so `bun dev` works without extra setup.
   * Enforce presence at runtime inside the specific feature that needs it.
   */
  server: {
    FAL_KEY: z.string().min(1).optional(),
  },

  client: {},

  runtimeEnv: {
    FAL_KEY: process.env.FAL_KEY,
  },
});


import { z } from "zod"
import { engineSchema, nonEmptyStringSchema, slugSchema, urlSchema } from "./shared.schema"

/**
 * Minimal, flexible GDD schema.
 *
 * Rationale: the Markdown outline used in skills is a recommended template,
 * but different game types/tech stacks will vary. This schema enforces only the
 * invariants we care about:
 * - title + summary exist
 * - technical constraints can be captured (optionally)
 * - the doc is "implementation-ready" via success criteria
 */

export const gddSectionSchema = z.object({
  heading: nonEmptyStringSchema,
  markdown: nonEmptyStringSchema,
})

export const gddSchema = z.object({
  id: slugSchema.optional(),
  title: nonEmptyStringSchema,
  summary: nonEmptyStringSchema,
  technical: z
    .object({
      engine: engineSchema.optional(),
      cdnUrl: urlSchema.optional(),
      notes: z.array(nonEmptyStringSchema).default([]),
      // Any additional tech constraints, kept flexible.
      constraints: z.record(z.string(), z.unknown()).optional(),
    })
    .default({ notes: [] }),
  sections: z.array(gddSectionSchema).default([]),
  outOfScope: z.array(nonEmptyStringSchema).default([]),
  successCriteria: z.array(nonEmptyStringSchema).min(1),
})

export type Gdd = z.infer<typeof gddSchema>


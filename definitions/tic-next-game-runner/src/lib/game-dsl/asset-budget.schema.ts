import { z } from "zod"
import { nonEmptyStringSchema } from "./shared.schema"

const budgetItemSchema = z.object({
  allowed: z.boolean(),
  maxCount: z.number().int().min(0).max(50),
  notes: z.array(nonEmptyStringSchema).max(10).default([]),
})

export const assetBudgetSchema = z.object({
  // Total budget for any external generation calls (Fal or other APIs).
  externalCalls: z.object({
    allowed: z.boolean(),
    maxCount: z.number().int().min(0).max(50),
    // If true, the plan should pre-allocate the maxCount into categories below.
    mustPreAllocate: z.boolean().default(true),
    notes: z.array(nonEmptyStringSchema).max(10).default([]),
  }),

  // Per-category budgets (only relevant if externalCalls.allowed is true).
  image: budgetItemSchema,
  bgm: budgetItemSchema,
  sfx: budgetItemSchema,
  voiceover: budgetItemSchema,
  video: budgetItemSchema,
  model3d: budgetItemSchema,

  // General guidance for caching/reuse.
  cachingNotes: z.array(nonEmptyStringSchema).max(10).default([]),
})

export type AssetBudget = z.infer<typeof assetBudgetSchema>


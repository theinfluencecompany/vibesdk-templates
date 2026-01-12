import { z } from "zod"

export const nonEmptyStringSchema = z.string().trim().min(1)

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a hyphen-case slug")

export const urlSchema = z.string().url()

export const engineSchema = z.enum(["phaser", "three"])


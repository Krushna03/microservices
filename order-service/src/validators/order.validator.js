import { z } from "zod";

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "productId must be a valid 24-character hex string (ObjectId)"),

      name: z.string().min(1).max(200),

      quantity: z.number().int().positive(),

      price: z.number().nonnegative(),
    })
  ).min(1)
})

export const idempotencyKeySchema = z.string().min(1);
import { z } from "zod";

/** curator のAI出力スキーマ(docs/04 §3.4) */
export const curateOutputSchema = z.object({
  picks: z
    .array(
      z.object({
        article_id: z.number().int(),
        rank: z.number().int().min(1).max(5),
        reason: z.string().min(1).max(500),
      }),
    )
    .max(5),
});

export type CurateOutput = z.infer<typeof curateOutputSchema>;

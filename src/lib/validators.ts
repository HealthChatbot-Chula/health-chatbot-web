import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().trim().min(1).max(8000)
});

import { z } from "zod";

const envSchema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),

  DEV_AUTH_BYPASS: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),

  LINE_CHANNEL_ID: z.string().optional().default(""),
  LINE_CHANNEL_SECRET: z.string().optional().default(""),
  LINE_BOT_PROMPT: z.enum(["normal", "aggressive"]).default("aggressive"),

  CHAT_COMPLETIONS_BASE_URL: z.string().url(),
  CHAT_COMPLETIONS_PATH: z.string().min(1).default("/v1/chat/completions"),
  CHAT_MODEL: z.string().min(1).default("health-agent"),
  CHAT_COMPLETIONS_API_KEY: z.string().optional().default(""),
  LAB_EXTRACTION_PATH: z.string().optional().default("")
})
  .superRefine((value, context) => {
    const canSkipLineConfig =
      value.DEV_AUTH_BYPASS && value.NODE_ENV !== "production";

    if (!canSkipLineConfig && value.LINE_CHANNEL_ID.length < 1) {
      context.addIssue({
        code: "custom",
        path: ["LINE_CHANNEL_ID"],
        message: "LINE_CHANNEL_ID is required unless DEV_AUTH_BYPASS=true in development"
      });
    }

    if (!canSkipLineConfig && value.LINE_CHANNEL_SECRET.length < 1) {
      context.addIssue({
        code: "custom",
        path: ["LINE_CHANNEL_SECRET"],
        message: "LINE_CHANNEL_SECRET is required unless DEV_AUTH_BYPASS=true in development"
      });
    }
  });

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS,
  LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID,
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
  LINE_BOT_PROMPT: process.env.LINE_BOT_PROMPT,
  CHAT_COMPLETIONS_BASE_URL: process.env.CHAT_COMPLETIONS_BASE_URL,
  CHAT_COMPLETIONS_PATH: process.env.CHAT_COMPLETIONS_PATH,
  CHAT_MODEL: process.env.CHAT_MODEL,
  CHAT_COMPLETIONS_API_KEY: process.env.CHAT_COMPLETIONS_API_KEY,
  LAB_EXTRACTION_PATH: process.env.LAB_EXTRACTION_PATH
});

export const isProduction = env.NODE_ENV === "production";
export const isDevAuthBypassEnabled = env.DEV_AUTH_BYPASS && !isProduction;

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  APP_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  SESSION_COOKIE_NAME: z.string().min(1).default("megaerp_session"),
  SESSION_JWT_SECRET: isProd ? z.string().min(32) : z.string().min(32).default("dev-session-secret-change-me-32-chars-0001"),
  PASSWORD_RESET_SECRET: z.preprocess(emptyStringToUndefined, z.string().min(16).optional()),

  MYSQL_HOST: z.string().min(1).default("localhost"),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().min(1).default("root"),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_DATABASE: z.string().min(1).default("megaerp"),

  MP_ACCESS_TOKEN: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  WEBHOOK_BASE_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  MP_WEBHOOK_SIGNATURE_SECRET: z.preprocess(emptyStringToUndefined, z.string().min(16).optional()),

  MEGA_NFE_API_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  MEGA_NFE_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(16).optional()),
  MEGA_NFE_DEFAULT_ENV: z.preprocess(emptyStringToUndefined, z.enum(["homolog", "prod"]).optional()),

  GOOGLE_CLIENT_ID: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  GOOGLE_REDIRECT_URI: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
});

export const env = schema.parse(process.env);

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  APP_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  SESSION_COOKIE_NAME: z.string().min(1).default("megaerp_session"),
  SESSION_JWT_SECRET: z.string().min(32),

  MYSQL_HOST: z.string().min(1).default("localhost"),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().min(1).default("root"),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_DATABASE: z.string().min(1).default("megaerp"),

  MP_ACCESS_TOKEN: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
});

export const env = schema.parse(process.env);

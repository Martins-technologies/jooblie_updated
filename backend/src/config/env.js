import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.string().default('false'),
  DEFAULT_SITE_SLUG: z.string().min(1).default('jooblie'),
  LOG_LEVEL: z.string().default('info'),
  REQUEST_BODY_LIMIT: z.string().default('256kb'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  WRITE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  WRITE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  INITIAL_ADMIN_EMAIL: z.string().trim().email().optional().or(z.literal('')).transform((value) => value || undefined),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid backend environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

const parsed = result.data;

export const env = {
  ...parsed,
  CORS_ORIGINS: parsed.CORS_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean),
  TRUST_PROXY:
    parsed.TRUST_PROXY === 'true'
      ? true
      : parsed.TRUST_PROXY === 'false'
        ? false
        : Number.isNaN(Number(parsed.TRUST_PROXY))
          ? parsed.TRUST_PROXY
          : Number(parsed.TRUST_PROXY),
};

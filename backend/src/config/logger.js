import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'token',
      '*.token',
      'access_token',
      '*.access_token',
      'refresh_token',
      '*.refresh_token',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
    censor: '[REDACTED]',
  },
});

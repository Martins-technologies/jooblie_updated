import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { writeSecurityEvent } from '../utils/audit.js';

function rateLimitHandler(eventType) {
  return async (req, res) => {
    await writeSecurityEvent(req, {
      eventType,
      severity: 'medium',
      metadata: {
        method: req.method,
      },
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        requestId: req.requestId,
      },
    });
  };
}

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

export const generalLimiter = rateLimit({
  ...common,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  handler: rateLimitHandler('general_rate_limit'),
});

export const authLimiter = rateLimit({
  ...common,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  handler: rateLimitHandler('auth_rate_limit'),
});

export const writeLimiter = rateLimit({
  ...common,
  windowMs: env.WRITE_RATE_LIMIT_WINDOW_MS,
  limit: env.WRITE_RATE_LIMIT_MAX,
  handler: rateLimitHandler('write_rate_limit'),
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestContext } from './middleware/requestContext.js';
import { generalLimiter } from './middleware/security.js';
import { optionalAuth } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { ApiError } from './utils/http.js';
import routes from './routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);

app.use(requestContext);

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.requestId,
    customProps: (req) => ({
      requestId: req.requestId,
      clientIp: req.clientIp,
      serverIp: req.serverIp,
      userId: req.user?.id || null,
      site: req.site?.slug || req.get('x-site-slug') || null,
    }),
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    hsts: env.NODE_ENV === 'production'
      ? { maxAge: 15_552_000, includeSubDomains: true, preload: false }
      : false,
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new ApiError(403, 'Origin is not allowed by CORS.', 'CORS_FORBIDDEN'));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Site-Slug', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: false,
    maxAge: 600,
  }),
);

app.use(compression());
app.use(hpp());
app.use(express.json({ limit: env.REQUEST_BODY_LIMIT, strict: true }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use(generalLimiter);
app.use(optionalAuth);

// Authenticated/dashboard responses should never be cached by shared intermediaries.
app.use((req, res, next) => {
  if (/^\/api\/v1\/(auth|job-seeker|recruiter|admin)(?:\/|$)/.test(req.path)) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;

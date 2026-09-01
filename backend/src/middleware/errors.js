import { ApiError } from '../utils/http.js';
import { logger } from '../config/logger.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, 'The requested API endpoint was not found.', 'NOT_FOUND'));
}

export function errorHandler(error, req, res, _next) {
  const explicitStatus = Number(error?.status || error?.statusCode);
  const status = error instanceof ApiError
    ? error.status
    : Number.isInteger(explicitStatus) && explicitStatus >= 400 && explicitStatus < 600
      ? explicitStatus
      : error?.type === 'entity.parse.failed'
        ? 400
        : 500;

  if (status >= 500) {
    logger.error(
      {
        err: error,
        requestId: req.requestId,
        route: req.originalUrl,
      },
      'Unhandled API error',
    );
  }

  const isApiError = error instanceof ApiError;
  const isBadJson = error?.type === 'entity.parse.failed';
  const payload = {
    error: {
      code: isApiError ? error.code : isBadJson ? 'INVALID_JSON' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
      message: isApiError
        ? error.message
        : isBadJson
          ? 'Request body contains invalid JSON.'
          : status < 500
            ? (error?.message || 'The request could not be completed.')
            : 'An unexpected server error occurred.',
      requestId: req.requestId,
    },
  };

  if (isApiError && error.details && process.env.NODE_ENV !== 'production') {
    payload.error.details = error.details;
  }

  res.status(status).json(payload);
}

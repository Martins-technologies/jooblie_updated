export class ApiError extends Error {
  constructor(status, message, code = 'API_ERROR', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit || String(defaultLimit), 10) || defaultLimit),
  );

  return {
    page,
    limit,
    from: (page - 1) * limit,
    to: page * limit - 1,
  };
}

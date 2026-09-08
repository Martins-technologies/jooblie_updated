import { ApiError } from '../utils/http.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(
        new ApiError(
          400,
          'Some submitted fields are invalid.',
          'VALIDATION_ERROR',
          result.error.flatten(),
        ),
      );
    }

    req[source] = result.data;
    return next();
  };
}

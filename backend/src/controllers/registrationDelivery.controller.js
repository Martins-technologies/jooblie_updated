import { timingSafeEqual } from 'node:crypto';
import { runRegistrationDeliveries } from '../services/registrationDelivery.js';
import { ApiError, asyncHandler } from '../utils/http.js';

export function createDeliveryWorkerHandler({ db, env = process.env, run = runRegistrationDeliveries }) {
  return asyncHandler(async (req, res) => {
    const secret = env.MISSISSAUGA_WORKER_SECRET;
    if (!secret || secret.length < 32) throw new ApiError(503, 'Delivery worker is not configured.', 'WORKER_NOT_CONFIGURED');
    const expected = Buffer.from(`Bearer ${secret}`), provided = Buffer.from(req.get('authorization') || '');
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new ApiError(401, 'Authentication required.', 'UNAUTHORIZED');
    // One bounded provider call per invocation fits the existing 30s host limit.
    // Schedule this endpoint only after reviewing queue/provider configuration.
    const summary = await run({ db, env, limit: 1 });
    res.set('Cache-Control', 'no-store').json(summary);
  });
}

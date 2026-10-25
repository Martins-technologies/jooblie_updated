import { serviceDb } from '../src/config/supabase.js';
import { runRegistrationDeliveries } from '../src/services/registrationDelivery.js';

try {
  console.log(JSON.stringify(await runRegistrationDeliveries({ db: serviceDb })));
} catch (error) {
  // Error text is owned by our worker; provider bodies/contact data are omitted.
  console.error(JSON.stringify({ code: error.message.startsWith('DELIVERY_') ? error.message : 'DELIVERY_WORKER_FAILED' }));
  process.exitCode = 1;
}

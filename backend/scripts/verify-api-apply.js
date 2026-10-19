import dotenv from 'dotenv';
dotenv.config();
import { serviceDb } from '../src/config/supabase.js';

async function main() {
  const email = 'dev.test@jooblie.com';
  const { data: signIn, error: sErr } = await serviceDb.auth.signInWithPassword({
    email,
    password: 'Password123!'
  });
  if (sErr) {
    console.error('Sign in failed:', sErr);
    process.exit(1);
  }
  const token = signIn.session.access_token;
  const jobId = '656e845f-164b-45c1-af12-517e711608bc';

  // Call the actual API endpoint
  const res = await fetch(`http://localhost:4000/api/v1/job-seeker/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ cover_letter: 'Testing application submission from verified test account.' })
  });

  const body = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response body:', body);

  // Now delete the application so user can click Apply with Jooblie freshly in their UI!
  await serviceDb.from('applications').delete().eq('job_id', jobId).eq('applicant_id', signIn.user.id);
  console.log('Test application cleared! User can now click "Apply with Jooblie" in the UI.');

  process.exit(0);
}

main().catch(console.error);

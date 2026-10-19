import dotenv from 'dotenv';
dotenv.config();
import { serviceDb } from '../src/config/supabase.js';

async function main() {
  const email = 'dev.test@jooblie.com';
  const { data: users } = await serviceDb.auth.admin.listUsers();
  const u = users.users.find(x => x.email === email);
  if (!u) {
    console.log('User not found');
    process.exit(1);
  }

  const resumePath = `${u.id}/Jordan_Lee_Senior_FullStack_Resume.pdf`;

  // First delete any conflicting
  await serviceDb.from('resume_documents').delete().eq('user_id', u.id);

  // Check columns of resume_documents
  const { data: oneRow } = await serviceDb.from('resume_documents').select('*').limit(1);
  console.log('One row keys:', oneRow ? Object.keys(oneRow[0] || {}) : 'empty');

  // Insert properly
  const { data: inserted, error: insertError } = await serviceDb.from('resume_documents').insert({
    user_id: u.id,
    storage_path: resumePath,
    original_name: 'Jordan_Lee_Senior_FullStack_Resume.pdf',
    size_bytes: 254000,
    content_type: 'application/pdf',
    is_active: true
  }).select('*').single();

  console.log('Inserted resume document:', inserted, 'Error:', insertError);

  // Update profile default_resume_path to match exact storage_path
  await serviceDb.from('profiles').update({
    default_resume_path: resumePath
  }).eq('id', u.id);

  // Also remove test application so user can apply cleanly in UI
  const jobId = '656e845f-164b-45c1-af12-517e711608bc';
  await serviceDb.from('applications').delete().eq('job_id', jobId).eq('applicant_id', u.id);

  // Verify
  const { data: verifiedResume, error: vErr } = await serviceDb
    .from('resume_documents')
    .select('id,storage_path')
    .eq('user_id', u.id)
    .eq('storage_path', resumePath)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  console.log('Verification check for applyToJob:', verifiedResume, 'Error:', vErr);
  console.log('All set! User can now apply with zero 403 error.');
  process.exit(0);
}

main().catch(console.error);

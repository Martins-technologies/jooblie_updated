// Explicit, one-off cleanup of reviewed demo records. Dry-run unless --apply.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const examples = [
  ['b9141770-b1ed-495c-a935-b12ea627ce34', 'Logistics Coordinator', 402, 54000, 68000, ['Shipment scheduling', 'Inventory control', 'Excel'], 'Coordinate inbound deliveries, maintain shipment records and resolve scheduling changes with drivers and warehouse colleagues.'],
  ['19bde37b-20c3-4adf-9384-f9b1f634dd37', 'Medical Office Coordinator', 301, 48000, 60000, ['Patient scheduling', 'Medical terminology', 'Confidentiality'], 'Schedule patient appointments, maintain accurate intake records and support the daily administration of a Calgary clinic. This is a non-clinical position.'],
  ['3c6eed13-e2f4-494c-9339-a7a649addb9c', 'Data Analyst', 202, 72000, 92000, ['SQL', 'Power BI', 'Excel'], 'Build reporting dashboards, validate operational datasets and explain business trends to non-technical stakeholders.'],
  ['e1dcf2da-6c6d-41dd-94b7-a3531cedb69a', 'Human Resources Coordinator', 103, 56000, 70000, ['Onboarding', 'HRIS', 'Employee records'], 'Coordinate onboarding, maintain confidential employee records and support recruitment scheduling and HR reporting.'],
  ['26514023-eefa-4f02-b9fc-c1f25be69b2f', 'Software Developer', 201, 85000, 110000, ['JavaScript', 'Node.js', 'PostgreSQL'], 'Develop reliable web services, maintain application features and collaborate with product and quality assurance teams.'],
  ['e2f98be2-6b36-4b97-b4d4-1e8aed9366fa', 'Warehouse Operations Coordinator', 402, 52000, 65000, ['Inventory management', 'Receiving', 'Workplace safety'], 'Coordinate receiving and dispatch, investigate stock discrepancies and maintain clear handover records across warehouse shifts.'],
  ['7138c97d-252c-4fee-8c2d-cd3b47fd2c8a', 'Frontend Developer', 201, 78000, 100000, ['React', 'TypeScript', 'Accessibility'], 'Build accessible interfaces, integrate REST APIs and improve application performance through testing and code review.'],
  ['0cbef61d-9793-450b-834c-8c78aa406a56', 'Clinic Administrative Assistant', 301, 44000, 55000, ['Appointment booking', 'Data entry', 'Customer service'], 'Welcome patients, organize clinic correspondence and help the administrative team maintain accurate appointment and billing records. This is a non-clinical position.'],
  ['94660539-dcd8-4816-912f-e698e00eb283', 'Full-Stack Developer', 201, 90000, 115000, ['React', 'Node.js', 'SQL'], 'Deliver web application features from user interface through database, write automated checks and troubleshoot production-style issues.'],
  ['75cb21c9-bc58-4970-8e44-0251497fbd5e', 'Customer Service Representative', 102, 42000, 52000, ['Customer support', 'CRM', 'Written communication'], 'Respond to customer enquiries, document service requests and coordinate timely resolutions with internal teams.'],
  ['a81c9be0-89f8-4bba-9c0c-53ae2c777b2f', 'Junior Software Developer', 201, 62000, 78000, ['JavaScript', 'Git', 'Unit testing'], 'Implement well-scoped application features, investigate defects and learn team development practices through mentoring and code review.'],
  ['656e845f-164b-45c1-af12-517e711608bc', 'Senior Full-Stack Software Engineer', 201, 115000, 145000, ['React', 'TypeScript', 'PostgreSQL'], 'Design maintainable application services, lead technical reviews and mentor developers delivering secure and accessible web products.'],
  ['ffcc2194-3bf2-479a-a12c-f93385273302', 'Class 1 Delivery Driver', 401, 62000, 82000, ['Class 1 licence', 'Vehicle inspections', 'Delivery documentation'], 'Complete scheduled regional deliveries, perform pre-trip inspections and maintain accurate delivery and vehicle records. An appropriate Alberta Class 1 licence and air brake qualification would be required for a real role.'],
  ['42e74494-ce64-4f5f-bd69-cf005be6095d', 'React Developer', 201, 90000, 115000, ['React', 'TypeScript', 'Component testing'], 'Build reusable interface components, improve frontend reliability and collaborate with designers on responsive user journeys.'],
];
const archiveIds = ['068f1706-ae74-418c-8e64-da65fc050963', 'a2e9aac5-726e-4f4e-b0bf-f298ea4ad94d', '33614732-e0e2-466c-b978-b00ce0ba83aa', 'd9db3961-8efe-45f1-8947-7ccd9a6ef5b9'];
const ids = [...examples.map(row => row[0]), ...archiveIds];
const { data: originals, error } = await db.from('jobs').select('*').in('id', ids).is('deleted_at', null);
if (error) throw error;
if (originals.length !== ids.length) throw new Error('Reviewed record set changed; stop for review.');
const byId = new Map(originals.map(row => [row.id, row]));
for (const id of archiveIds) if (byId.get(id).status !== 'closed') throw new Error('Archive candidate no longer closed.');
console.log(JSON.stringify({ refresh: examples.length, archive: archiveIds.length, untouched: 'All other jobs, companies, users and applications', apply: process.argv.includes('--apply') }));
if (!process.argv.includes('--apply')) process.exit(0);
const backupDir = join(homedir(), '.codex', 'backups', 'jooblie', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(backupDir, { recursive: true });
const { data: mappings, error: mappingsError } = await db.from('job_sites').select('*').in('job_id', ids);
if (mappingsError) throw mappingsError;
await writeFile(join(backupDir, 'before.json'), JSON.stringify({ jobs: originals, job_sites: mappings }, null, 2), { flag: 'wx' });
console.log(`Backup: ${backupDir}`);
const now = new Date().toISOString();
const changes = [];
for (const [id, title, category, min, max, skills, responsibility] of examples) {
  const original = byId.get(id);
  const description = [
    'DEMO LISTING — This fictional Calgary role is for platform demonstration only. It is not a real vacancy; do not submit personal information or an application.',
    `About the role\n${title} based in Calgary, Alberta. This sample represents a full-time, on-site position with a typical Monday-to-Friday schedule; delivery and warehouse schedules may vary.`,
    `Responsibilities\n${responsibility}\nMaintain accurate documentation, communicate clearly with colleagues and follow workplace safety and privacy procedures.`,
    `Qualifications\nRelevant training or practical experience in ${skills.join(', ')}. Strong organization, attention to detail and a collaborative approach. Equivalent practical experience may be considered.`,
    `Illustrative compensation\nCAD ${min.toLocaleString('en-CA')}–${max.toLocaleString('en-CA')} per year. This is invented sample compensation, not a verified market rate or employer offer. Benefits, hours and terms would be confirmed by an employer for a real vacancy.`,
    'Location\nCalgary, Alberta, Canada. No actual employer location or hiring commitment is represented by this demo.',
  ].join('\n\n');
  changes.push({ id, original, patch: { title: `${title} (Demo)`, description, category_id: category, city: 'Calgary', province: 'AB', is_remote: false, workplace_type: 'onsite', salary_min: min, salary_max: max, salary_currency: 'CAD', salary_period: 'yearly', employment_type: 'full_time', skills, updated_at: now } });
}
for (const id of archiveIds) changes.push({ id, original: byId.get(id), patch: { deleted_at: now, updated_at: now } });
const completed = [];
for (const { id, original, patch } of changes) {
  let query = db.from('jobs').update(patch).eq('id', id).is('deleted_at', null);
  if (original.updated_at) query = query.eq('updated_at', original.updated_at);
  const { data, error: updateError } = await query.select('id,title,city,province,deleted_at').single();
  if (updateError) throw new Error(`Stopped at ${id}; ${completed.length} completed. Backup ${backupDir}. ${updateError.message}`);
  completed.push(data);
  await writeFile(join(backupDir, 'completed.json'), JSON.stringify(completed, null, 2));
}
const { data: verified, error: verifyError } = await db.from('jobs').select('id,title,city,province,description,deleted_at').in('id', ids);
if (verifyError) throw verifyError;
for (const row of verified) {
  if (archiveIds.includes(row.id)) { if (!row.deleted_at) throw new Error('Archive verification failed'); }
  else if (row.city !== 'Calgary' || row.province !== 'AB' || !row.title.endsWith('(Demo)') || !row.description.startsWith('DEMO LISTING')) throw new Error('Refresh verification failed');
}
console.log(JSON.stringify({ verified: verified.length, refreshed: examples.length, archived: archiveIds.length }));

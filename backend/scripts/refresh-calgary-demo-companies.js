// Reviewed demo-company cleanup; --apply is required for writes.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const profiles = [
  ['ABC TEST EVIR', 'Bow River Digital Studio', 'accessible websites, frontend development and digital product design'],
  ['Acme inc', 'Foothills Business Services', 'office administration, customer coordination and business support'],
  ['check', 'Aspen Trail Software', 'web application development, automated testing and developer mentoring'],
  ['chekcingzeeshanscompany', 'Prairie Route Transport', 'regional delivery coordination, fleet operations and transport administration'],
  ['darz', 'Chinook Application Studio', 'business software, API development and database-backed web applications'],
  ['dfgdfgdfg', 'Glenmore Facilities Services', 'facility coordination, maintenance scheduling and workplace support'],
  ['dfsd g', 'Elbow Valley Office Services', 'document management, reception and administrative support'],
  ['eg', 'Skyline Interface Studio', 'React interfaces, accessible design systems and frontend quality assurance'],
  ['ert', 'Willow Creek Clinic Support', 'non-clinical clinic administration, appointment coordination and patient reception'],
  ['janedoe', 'Cedar Ridge Customer Services', 'customer enquiries, service coordination and client onboarding'],
  ['jhsd see-teck', 'Westward Systems Studio', 'technical support, application maintenance and internal systems'],
  ['missrose', 'Meadowlark Office Solutions', 'office operations, scheduling and administrative coordination'],
  ['missrosefinal', 'Parkland Service Partners', 'customer support, scheduling and day-to-day business administration'],
  ['missrosetest', 'Foothills Freight Coordination', 'shipment scheduling, delivery documentation and logistics support'],
  ['sephora', 'Riverbend Retail Services', 'retail operations, customer experience and stock coordination'],
  ['sephora.com', 'Bow Valley Data & Software', 'data reporting, business analytics and full-stack application development'],
  ['sephotatesting', 'Summit Quality Studio', 'software testing, release checks and application quality assurance'],
  ['TechCorp Global', 'Alpine Platform Engineering', 'full-stack engineering, cloud applications and technical mentoring'],
  ['techo zone', 'Chinook Technology Support', 'IT service coordination, workstation support and software troubleshooting'],
  ['tekcol', 'Prairie Cloud Studio', 'cloud operations, application deployment and infrastructure support'],
  ['test', 'Calgary Care Administration', 'medical office coordination, appointment scheduling and confidential records administration'],
  ['test company alredy', 'Northgate Business Support', 'business administration, document processing and customer coordination'],
  ['testing', 'Prairie People Operations', 'HR administration, employee onboarding and recruitment coordination'],
  ['uzma', 'Chinook Customer Care', 'customer service, enquiry resolution and service request coordination'],
  ['uzmatest', 'Prairie Distribution Services', 'warehouse coordination, receiving, dispatch and inventory administration'],
  ['wrgtdfh', 'Evergreen Operations Studio', 'business operations, scheduling and cross-team coordination'],
  ['z1', 'Rocky View Equipment Support', 'equipment service scheduling, parts coordination and operational administration'],
];
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: originals, error } = await db.from('companies').select('*').in('name', profiles.map(p => p[0])).is('deleted_at', null);
if (error) throw error;
if (originals.length !== profiles.length) throw new Error('Reviewed company set changed; stop for review.');
console.log(JSON.stringify({ companies: profiles.length, apply: process.argv.includes('--apply'), preserved: ['jooblie', 'microsoft', 'dnaiyalcompny'] }));
if (!process.argv.includes('--apply')) process.exit(0);
const backupDir = join(homedir(), '.codex', 'backups', 'jooblie-companies', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(backupDir, { recursive: true });
await writeFile(join(backupDir, 'before.json'), JSON.stringify(originals, null, 2), { flag: 'wx' });
console.log(`Backup: ${backupDir}`);
const completed = [];
for (const [oldName, name, specialty] of profiles) {
  const original = originals.find(row => row.name === oldName);
  const patch = {
    description: `${name} is a fictional Calgary, Alberta company profile created to demonstrate Jooblie's employer directory. Its sample business focus is ${specialty}.\n\nThe profile illustrates a professional workplace that values clear communication, practical skills, collaboration and respectful service. Linked demo roles show how responsibilities, qualifications and compensation can be presented clearly.\n\nDemo profile only: this is not a verified real business, endorsement or actual hiring commitment. Any compensation and workplace details on demo listings are illustrative. Do not submit personal information in response to a demo vacancy.`,
    website: `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.example`,
    logo_path: null,
    updated_at: new Date().toISOString(),
  };
  // A renamed fictional employer must not inherit a verified-business badge.
  if (original.verification_status === 'verified') Object.assign(patch, { verification_status: 'pending', verified_at: null, verified_by: null });
  let query = db.from('companies').update(patch).eq('id', original.id).eq('name', oldName);
  if (original.updated_at) query = query.eq('updated_at', original.updated_at);
  const { data, error: updateError } = await query.select('id,name,website,verification_status').single();
  if (updateError) throw new Error(`Stopped at ${oldName}; ${completed.length} completed. ${updateError.message}`);
  completed.push(data);
  await writeFile(join(backupDir, 'completed.json'), JSON.stringify(completed, null, 2));
}
const { data: verified, error: verifyError } = await db.from('companies').select('id,name,description,website,logo_path,verification_status').in('id', originals.map(r => r.id));
if (verifyError) throw verifyError;
if (verified.length !== profiles.length || verified.some(row => !row.description.includes('Calgary, Alberta') || !row.website.endsWith('.example') || row.logo_path || row.verification_status === 'verified')) throw new Error('Verification failed');
console.log(JSON.stringify({ verified: verified.length, idsPreserved: true, namesUnchanged: 'Database enforces immutable company names' }));

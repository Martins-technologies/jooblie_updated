import { serviceDb } from '../src/config/supabase.js';

async function seed() {
  console.log('Seeding professional company & jobs...');

  // 1. Ensure verified employer company
  let companyId = null;
  const { data: existingComp } = await serviceDb
    .from('companies')
    .select('id, name')
    .ilike('name', 'TechCorp Global%')
    .maybeSingle();

  if (existingComp) {
    companyId = existingComp.id;
    await serviceDb.from('companies').update({
      verification_status: 'verified',
      status: 'active',
      description: 'TechCorp Global is a premier enterprise software and cloud engineering organization delivering mission-critical SaaS architectures.',
      website: 'https://techcorpglobal.com',
    }).eq('id', companyId);
  } else {
    const { data: newComp, error: compErr } = await serviceDb
      .from('companies')
      .insert({
        name: 'TechCorp Global',
        website: 'https://techcorpglobal.com',
        registration_number: 'TC-CAN-88992',
        description: 'TechCorp Global is a premier enterprise software and cloud engineering organization delivering mission-critical SaaS architectures.',
        verification_status: 'verified',
        status: 'active',
        created_by: '2fe9dd2a-2e16-4de7-8b96-ccafe6b4985f',
      })
      .select('id')
      .single();
    if (compErr) throw compErr;
    companyId = newComp.id;
  }
  console.log('Company ID:', companyId);

  // 2. Insert or update the Senior Full-Stack Software Engineer professional job
  const jobPayload = {
    company_id: companyId,
    origin_site_id: 1, // Jooblie
    category_id: 201, // Software Development
    title: 'Senior Full-Stack Software Engineer',
    description: `### About the Opportunity
TechCorp Global is searching for an exceptional Senior Full-Stack Software Engineer to build scalable, high-performance distributed web applications powering our enterprise platform.

### Key Responsibilities
- Architect, build, and maintain mission-critical full-stack applications using React, Node.js, and TypeScript.
- Design resilient REST APIs, microservices, and optimize PostgreSQL database schemas for sub-second latency.
- Collaborate closely with product managers, UX designers, and cloud infrastructure engineers.
- Drive engineering excellence through automated testing, rigorous code reviews, and CI/CD pipelines.

### Required Qualifications
- 5+ years of production experience in professional full-stack software development.
- Deep expertise in Modern React (hooks, state architecture) and Node.js backend runtimes.
- Strong proficiency in TypeScript, SQL databases (PostgreSQL), and RESTful API engineering.
- Solid understanding of Git workflows, cloud platforms (AWS/GCP), and agile development principles.

### Compensation & Benefits
- Competitive annual salary: $120,000 - $155,000 CAD
- Comprehensive health, dental, and vision insurance
- Flexible hybrid workplace model with home office stipend
- 4 weeks paid annual leave and dedicated learning budget`,
    province: 'ON',
    city: 'Toronto',
    is_remote: false,
    workplace_type: 'hybrid',
    experience_level: 'senior',
    salary_min: 120000,
    salary_max: 155000,
    salary_currency: 'CAD',
    created_by: '2fe9dd2a-2e16-4de7-8b96-ccafe6b4985f',
    salary_period: 'yearly',
    employment_type: 'full_time',
    skills: ['React', 'Node.js', 'TypeScript', 'JavaScript', 'SQL', 'REST APIs', 'Git', 'Agile'],
    status: 'active',
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const { data: existingJob } = await serviceDb
    .from('jobs')
    .select('id')
    .eq('company_id', companyId)
    .ilike('title', 'Senior Full-Stack Software Engineer%')
    .maybeSingle();

  let jobId;
  if (existingJob) {
    jobId = existingJob.id;
    await serviceDb.from('jobs').update(jobPayload).eq('id', jobId);
    console.log('Updated existing professional job:', jobId);
  } else {
    const { data: newJob, error: jobErr } = await serviceDb
      .from('jobs')
      .insert(jobPayload)
      .select('id')
      .single();
    if (jobErr) throw jobErr;
    jobId = newJob.id;
    console.log('Created new professional job:', jobId);
  }

  // Ensure visibility in job_sites for Jooblie (1) and IT Jobs (3)
  for (const siteId of [1, 3]) {
    await serviceDb
      .from('job_sites')
      .upsert({ job_id: jobId, site_id: siteId }, { onConflict: 'job_id,site_id' });
  }

  console.log('Successfully seeded professional job with ID:', jobId);
}

seed().catch(console.error);

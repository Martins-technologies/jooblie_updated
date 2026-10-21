import dotenv from 'dotenv';
dotenv.config();
import { serviceDb } from '../src/config/supabase.js';

async function main() {
  const jobId = '656e845f-164b-45c1-af12-517e711608bc';

  // 1. Fetch Job
  const { data: job, error: jobErr } = await serviceDb
    .from('jobs')
    .select('*, companies:company_id(*), categories:category_id(*)')
    .eq('id', jobId)
    .single();

  if (jobErr) {
    console.error('Job fetch error:', jobErr);
    process.exit(1);
  }

  console.log('--- Seeded Job ---');
  console.log('ID:', job.id);
  console.log('Title:', job.title, '| Company:', job.companies?.name);
  console.log('Skills:', job.skills);
  console.log('Location:', `${job.city}, ${job.province} (${job.workplace_type})`);
  console.log('Exp Level:', job.experience_level);

  // 2. Configure professional seeker: testjobseeker1@gmail.com
  const testSeekerEmail = 'testjobseeker1@gmail.com';
  const { data: seekerUser, error: seekerErr } = await serviceDb
    .from('profiles')
    .select('*')
    .eq('email', testSeekerEmail)
    .single();

  if (!seekerUser || seekerErr) {
    console.error('Seeker not found:', seekerErr);
    process.exit(1);
  }

  // Ensure verified resume exists in resume_documents
  const resumePath = `${seekerUser.id}/professional_senior_fullstack_resume.pdf`;
  await serviceDb.from('resume_documents').upsert({
    user_id: seekerUser.id,
    storage_path: resumePath,
    filename: 'Alex_Morgan_Senior_FullStack_Resume.pdf',
    mime_type: 'application/pdf',
    byte_size: 245000,
    is_active: true
  }, { onConflict: 'user_id,storage_path' });

  // Update profile to be a verified professional candidate
  const professionalSkills = ['React', 'Node.js', 'TypeScript', 'JavaScript', 'SQL', 'REST APIs', 'Git', 'Agile'];
  const professionalExperience = [
    {
      company: 'Enterprise Cloud Solutions',
      title: 'Senior Software Engineer',
      start_date: '2020-01-01',
      current: true,
      description: 'Architected scalable microservices and React frontends.'
    },
    {
      company: 'Tech Startups Hub',
      title: 'Full Stack Developer',
      start_date: '2018-01-01',
      end_date: '2019-12-31',
      current: false,
      description: 'Built high performance web applications with Node and TypeScript.'
    }
  ];

  const { error: updateErr } = await serviceDb
    .from('profiles')
    .update({
      full_name: 'Alex Morgan',
      phone: '+1(403) 000-0000',
      headline: 'Senior Full-Stack Software Engineer',
      location_city: 'Toronto',
      location_province: 'ON',
      skills: professionalSkills,
      experience: professionalExperience,
      default_resume_path: resumePath
    })
    .eq('id', seekerUser.id);

  if (updateErr) {
    console.error('Update profile error:', updateErr);
    process.exit(1);
  }

  console.log('\n--- Professional Profile Configured ---');
  console.log('Candidate:', 'Alex Morgan');
  console.log('Headline: Senior Full-Stack Software Engineer');
  console.log('Location: Toronto, ON');
  console.log('Skills:', professionalSkills);
  console.log('Experience: 2 roles, 6+ years total');
  console.log('Resume Path:', resumePath);

  // 3. Clear existing application if any so we can submit freshly
  await serviceDb
    .from('applications')
    .delete()
    .eq('job_id', jobId)
    .eq('applicant_id', seekerUser.id);

  // 4. Submit application as professional candidate
  const { data: newApp, error: appErr } = await serviceDb
    .from('applications')
    .insert({
      job_id: jobId,
      applicant_id: seekerUser.id,
      resume_path: resumePath,
      cover_letter: 'I am excited to apply for the Senior Full-Stack Software Engineer role at TechCorp Global. With over 6 years of experience building high-scale React, TypeScript, and Node.js applications in Toronto, my background directly fulfills all required criteria.',
      applied_via_site_id: 1,
      status: 'submitted'
    })
    .select('*')
    .single();

  if (appErr) {
    console.error('Failed to submit application:', appErr);
    process.exit(1);
  }

  console.log('\n--- Application Submitted & Validated ---');
  console.log('Application ID:', newApp.id);
  console.log('Job ID:', newApp.job_id);
  console.log('Applicant ID:', newApp.applicant_id);
  console.log('Status:', newApp.status);
  console.log('Applied at:', newApp.created_at);
  console.log('Cover Letter:', newApp.cover_letter);
  console.log('\n>>> SUCCESS! Professional candidate application registered and verified in DB.');

  process.exit(0);
}

main().catch(console.error);

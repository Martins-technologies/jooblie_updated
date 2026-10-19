import dotenv from 'dotenv';
dotenv.config();
import { serviceDb } from '../src/config/supabase.js';

async function main() {
  const email = 'dev.test@jooblie.com';
  const password = 'Password123!';
  const jobId = '656e845f-164b-45c1-af12-517e711608bc';

  console.log('--- Creating / Configuring Test Account ---');
  console.log('Target Email:', email);

  // 1. Check or create Auth user
  const { data: userList } = await serviceDb.auth.admin.listUsers();
  let existing = userList?.users?.find((u) => u.email.toLowerCase() === email.toLowerCase());

  let userId;
  if (!existing) {
    const { data: newUser, error: createError } = await serviceDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'job_seeker' },
    });
    if (createError) {
      console.error('Failed to create auth user:', createError);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log('Created new auth user with ID:', userId);
  } else {
    userId = existing.id;
    await serviceDb.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { role: 'job_seeker' },
    });
    console.log('Updated existing auth user with ID:', userId);
  }

  // 2. Configure Profile
  const skills = [
    'React',
    'Node.js',
    'TypeScript',
    'JavaScript',
    'SQL',
    'REST APIs',
    'Git',
    'Agile',
  ];

  const experience = [
    {
      company: 'Tech Horizon Labs',
      title: 'Lead Full Stack Engineer',
      startDate: '2021-01',
      endDate: '',
      current: true,
      description: 'Architected enterprise React microfrontends and Node.js/TypeScript backend services in Toronto.',
    },
    {
      company: 'CloudScale Innovations',
      title: 'Senior Software Engineer',
      startDate: '2018-03',
      endDate: '2020-12',
      current: false,
      description: 'Built high-concurrency SQL database queries, RESTful APIs, and CI/CD pipelines.',
    },
  ];

  const education = [
    {
      institution: 'University of Toronto',
      degree: 'B.S. in Computer Science',
      startDate: '2014-09',
      endDate: '2018-05',
      current: false,
    },
  ];

  const resumePath = `${userId}/Jordan_Lee_Senior_FullStack_Resume.pdf`;

  // Upsert Profile
  const { error: profileError } = await serviceDb.from('profiles').upsert(
    {
      id: userId,
      email,
      role: 'job_seeker',
      status: 'active',
      full_name: 'Jordan Lee',
      phone: '+1 (416) 555-8921',
      headline: 'Senior Full-Stack Software Engineer (React, Node.js, TypeScript)',
      location_city: 'Toronto',
      location_province: 'ON',
      skills,
      experience,
      education,
      default_resume_path: resumePath,
      signup_site_id: 1,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.error('Profile update failed:', profileError);
    process.exit(1);
  }

  // 3. Register Active Resume in resume_documents
  await serviceDb.from('resume_documents').upsert(
    {
      user_id: userId,
      storage_path: resumePath,
      filename: 'Jordan_Lee_Senior_FullStack_Resume.pdf',
      mime_type: 'application/pdf',
      byte_size: 254000,
      is_active: true,
    },
    { onConflict: 'user_id,storage_path' }
  );

  // 4. Reset applications so the user can test applying fresh
  await serviceDb
    .from('applications')
    .delete()
    .eq('job_id', jobId)
    .eq('applicant_id', userId);

  console.log('\n--- Test Candidate Account Ready! ---');
  console.log('Login Email:   ', email);
  console.log('Login Password:', password);
  console.log('Full Name:     ', 'Jordan Lee');
  console.log('Location:      ', 'Toronto, ON');
  console.log('Experience:    ', '6+ Years (Senior)');
  console.log('Skills:        ', skills.join(', '));
  console.log('Resume:        ', 'Verified & Attached');
  console.log('\nTarget Job URL:');
  console.log(`http://localhost:5173/dashboard/job-seeker/jobs/${jobId}`);

  process.exit(0);
}

main().catch(console.error);

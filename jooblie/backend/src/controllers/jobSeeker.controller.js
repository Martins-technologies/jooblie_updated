import { serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { writeAuditLog } from '../utils/audit.js';

/* =========================================================
   COMMON JOB SELECT
========================================================= */

const jobSelect = `
  id,title,description,province,city,is_remote,
  employment_type,workplace_type,experience_level,salary_min,salary_max,salary_currency,salary_period,
  skills,status,published_at,created_at,updated_at,expires_at,
  company_id,category_id,origin_site_id,
  companies:company_id(
    id,
    name,
    logo_path,
    website,
    verification_status,
    status
  ),
  categories:category_id(
    id,
    name,
    slug,
    sector_id
  )
`;

/* =========================================================
   CHECK JOB VISIBILITY
========================================================= */

async function assertVisibleActiveJob(jobId, siteId) {
  const {
    data: mapping,
    error: mappingError,
  } = await serviceDb
    .from('job_sites')
    .select('job_id')
    .eq('job_id', jobId)
    .eq('site_id', siteId)
    .maybeSingle();

  if (mappingError) {
    console.error('JOB VISIBILITY CHECK ERROR:', mappingError);

    throw new ApiError(
      500,
      'The job could not be checked.',
      'JOB_VISIBILITY_CHECK_FAILED',
      mappingError.message,
    );
  }

  if (!mapping) {
    throw new ApiError(
      404,
      'The job is not available on this site.',
      'JOB_NOT_FOUND',
    );
  }

  const {
    data: job,
    error: jobError,
  } = await serviceDb
    .from('jobs')
    .select('id,status,expires_at')
    .eq('id', jobId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (jobError) {
    console.error('JOB CHECK ERROR:', jobError);

    throw new ApiError(
      500,
      'The job could not be checked.',
      'JOB_CHECK_FAILED',
      jobError.message,
    );
  }

  if (!job) {
    throw new ApiError(
      404,
      'The job is not available.',
      'JOB_NOT_FOUND',
    );
  }

  if (
    job.expires_at &&
    new Date(job.expires_at) <= new Date()
  ) {
    throw new ApiError(
      404,
      'The job is no longer available.',
      'JOB_EXPIRED',
    );
  }

  return job;
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function text(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function tokenize(value) {
  const stopWords = new Set([
    'and',
    'the',
    'for',
    'with',
    'from',
    'that',
    'this',
    'your',
    'you',
    'job',
    'jobs',
    'role',
    'work',
    'worker',
    'developer',
    'specialist',
  ]);

  return [
    ...new Set(
      text(value)
        .split(/[^a-z0-9+#.]+/i)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 2 &&
            !stopWords.has(token),
        ),
    ),
  ];
}

/* =========================================================
   RECOMMENDATION SCORE
========================================================= */

function recommendationScore(job, profile, savedIds) {
  const profileSkills = Array.isArray(profile?.skills)
    ? profile.skills
    : [];

  const skillTokens = profileSkills.flatMap((skill) =>
    tokenize(skill),
  );

  const headlineTokens = tokenize(profile?.headline);

  const categoryName =
    job?.categories?.name || '';

  const categorySlug =
    job?.categories?.slug || '';

  const companyName =
    job?.companies?.name || '';

  const jobSkills = Array.isArray(job?.skills)
    ? job.skills.join(' ')
    : '';

  const searchable = text(
    [
      job?.title,
      job?.description,
      jobSkills,
      categoryName,
      categorySlug,
      companyName,
      job?.city,
      job?.province,
      job?.province,
    ]
      .filter(Boolean)
      .join(' '),
  );

  let score = 0;
  const reasons = [];

  for (const token of skillTokens) {
    if (searchable.includes(token)) {
      score += 7;

      if (reasons.length < 3) {
        reasons.push(token);
      }
    }
  }

  for (const token of headlineTokens) {
    if (searchable.includes(token)) {
      score += 3;
    }
  }

  if (
    profile?.location_city &&
    job?.city &&
    text(profile.location_city) === text(job.city)
  ) {
    score += 5;

    reasons.push('your city');
  }

  if (
    profile?.location_province &&
    job?.province &&
    text(profile.location_province) ===
      text(job.province)
  ) {
    score += 3;
  }

  if (savedIds.has(String(job.id))) {
    score += 1;
  }

  return {
    score,
    reasons: [...new Set(reasons)].slice(0, 3),
  };
}

/* =========================================================
   GET ACTIVE JOBS FOR CURRENT SITE
========================================================= */

async function visibleActiveJobs(siteId, limit = 120) {
  const now = new Date().toISOString();

  const {
    data,
    error,
  } = await serviceDb
    .from('job_sites')
    .select(
      `
        job_id,
        jobs!inner(
          ${jobSelect}
        )
      `,
    )
    .eq('site_id', siteId)
    .eq('jobs.status', 'active')
    .is('jobs.deleted_at', null)
    .or(
      `expires_at.is.null,expires_at.gt.${now}`,
      {
        referencedTable: 'jobs',
      },
    )
    .order('published_at', {
      referencedTable: 'jobs',
      ascending: false,
      nullsFirst: false,
    })
    .order('created_at', {
      referencedTable: 'jobs',
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error(
      'VISIBLE ACTIVE JOBS ERROR:',
      error,
    );

    throw new ApiError(
      500,
      'Recommended jobs could not be loaded.',
      'RECOMMENDED_JOBS_FAILED',
      error.message,
    );
  }

  return (data || [])
    .map((row) => row.jobs)
    .filter(Boolean);
}

/* =========================================================
   SAFE AUDIT LOGGING
========================================================= */

async function safeAudit(req, payload) {
  try {
    await writeAuditLog(req, payload);
  } catch (error) {
    /*
     * Business action should remain successful
     * even if audit logging temporarily fails.
     */
    console.error(
      'AUDIT LOG ERROR:',
      error,
    );
  }
}

/* =========================================================
   JOB SEEKER DASHBOARD
========================================================= */

export const dashboard = asyncHandler(
  async (req, res) => {
    const userId = req.user.id;

    const [
      appsRes,
      savedRes,
      appCountRes,
      savedCountRes,
      interviewCountRes,
      shortlistedCountRes,
      offerCountRes,
      profileRes,
    ] = await Promise.all([
      /* RECENT APPLICATIONS */

      serviceDb
        .from('applications')
        .select(
          `
            id,
            status,
            created_at,
            updated_at,
            job_id,
            jobs:job_id(
              ${jobSelect}
            )
          `,
        )
        .eq('applicant_id', userId)
        .is('deleted_at', null)
        .order('created_at', {
          ascending: false,
        })
        .limit(20),

      /* SAVED JOBS */

      serviceDb
        .from('saved_jobs')
        .select(
          `
            created_at,
            job_id,
            saved_via_site_id,
            jobs:job_id(
              ${jobSelect}
            )
          `,
        )
        .eq('user_id', userId)
        .order('created_at', {
          ascending: false,
        })
        .limit(50),

      /* APPLICATION COUNT */

      serviceDb
        .from('applications')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('applicant_id', userId)
        .is('deleted_at', null),

      /* SAVED COUNT */

      serviceDb
        .from('saved_jobs')
        .select('job_id', {
          count: 'exact',
          head: true,
        })
        .eq('user_id', userId),

      /* INTERVIEW COUNT */

      serviceDb
        .from('applications')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('applicant_id', userId)
        .is('deleted_at', null)
        .in('status', [
          'interviewing',
          'offered',
          'hired',
        ]),

      /* SHORTLISTED COUNT */

      serviceDb
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('applicant_id', userId)
        .is('deleted_at', null)
        .eq('status', 'shortlisted'),

      /* OFFER COUNT */

      serviceDb
        .from('applications')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('applicant_id', userId)
        .is('deleted_at', null)
        .in('status', [
          'offered',
          'hired',
        ]),

      /* PROFILE */

      serviceDb
        .from('profiles')
        .select(
          `
            full_name,
            phone,
            headline,
            location_province,
            location_city,
            skills,
            default_resume_path,
            experience,
            education
          `,
        )
        .eq('id', userId)
        .single(),
    ]);

    const firstError = [
      appsRes,
      savedRes,
      appCountRes,
      savedCountRes,
      interviewCountRes,
      shortlistedCountRes,
      offerCountRes,
      profileRes,
    ].find(
      (result) => result.error,
    )?.error;

    if (firstError) {
      console.error(
        'DASHBOARD LOAD ERROR:',
        firstError,
      );

      throw new ApiError(
        500,
        'Your dashboard could not be loaded.',
        'DASHBOARD_LOAD_FAILED',
        firstError.message,
      );
    }

    return res.json({
      metrics: {
        applications:
          appCountRes.count || 0,

        savedJobs:
          savedCountRes.count || 0,

        interviews:
          interviewCountRes.count || 0,

        shortlisted:
          shortlistedCountRes.count || 0,

        offers:
          offerCountRes.count || 0,
      },

      profile:
        profileRes.data || null,

      applications:
        appsRes.data || [],

      savedJobs:
        savedRes.data || [],

      savedJobIds:
        (savedRes.data || []).map(
          (row) => row.job_id,
        ),
    });
  },
);

/* =========================================================
   RECOMMENDED JOBS
========================================================= */

export const recommendedJobs = asyncHandler(
  async (req, res) => {
    const userId = req.user.id;

    const requestedLimit =
      Number.parseInt(
        req.query.limit,
        10,
      );

    const limit = Number.isFinite(
      requestedLimit,
    )
      ? Math.max(
          1,
          Math.min(
            requestedLimit,
            12,
          ),
        )
      : 6;

    const [
      profileRes,
      appsRes,
      savedRes,
      jobs,
    ] = await Promise.all([
      /* PROFILE */

      serviceDb
        .from('profiles')
        .select(
          `
            headline,
            location_province,
            location_city,
            skills
          `,
        )
        .eq('id', userId)
        .single(),

      /* APPLICATIONS */

      serviceDb
        .from('applications')
        .select('job_id')
        .eq('applicant_id', userId)
        .is('deleted_at', null),

      /* SAVED JOBS */

      serviceDb
        .from('saved_jobs')
        .select(
          `
            job_id,
            saved_via_site_id
          `,
        )
        .eq('user_id', userId),

      /* CURRENT SITE JOBS */

      visibleActiveJobs(
        req.site.id,
        120,
      ),
    ]);

    if (profileRes.error) {
      throw new ApiError(
        500,
        'Your profile could not be loaded.',
        'PROFILE_LOAD_FAILED',
        profileRes.error.message,
      );
    }

    if (
      appsRes.error ||
      savedRes.error
    ) {
      throw new ApiError(
        500,
        'Recommended jobs could not be loaded.',
        'RECOMMENDED_JOBS_FAILED',
        appsRes.error?.message ||
          savedRes.error?.message,
      );
    }

    const appliedIds = new Set(
      (appsRes.data || []).map(
        (row) =>
          String(row.job_id),
      ),
    );

    const savedIds = new Set(
      (savedRes.data || []).map(
        (row) =>
          String(row.job_id),
      ),
    );

    const profile =
      profileRes.data || {};

    const scored = jobs
      .filter(
        (job) =>
          !appliedIds.has(
            String(job.id),
          ),
      )
      .map((job) => {
        const recommendation =
          recommendationScore(
            job,
            profile,
            savedIds,
          );

        return {
          ...job,

          recommendation_score:
            recommendation.score,

          recommendation_reasons:
            recommendation.reasons,
        };
      })
      .sort((a, b) => {
        if (
          b.recommendation_score !==
          a.recommendation_score
        ) {
          return (
            b.recommendation_score -
            a.recommendation_score
          );
        }

        const bDate = new Date(
          b.published_at ||
            b.created_at ||
            0,
        ).getTime();

        const aDate = new Date(
          a.published_at ||
            a.created_at ||
            0,
        ).getTime();

        return bDate - aDate;
      })
      .slice(0, limit);

    return res.json({
      items: scored,

      basedOnProfile: Boolean(
        profile.headline ||
          profile.location_city ||
          profile.location_province ||
          (
            Array.isArray(
              profile.skills,
            ) &&
            profile.skills.length
          ),
      ),
    });
  },
);

/* =========================================================
   SAVE JOB

   IMPORTANT:
   saved_jobs.saved_via_site_id is NOT NULL.

   Therefore every saved job must store the site through
   which the user saved it.
========================================================= */

export const listResumes = asyncHandler(async (req, res) => {
  const { data, error } = await serviceDb.from('resume_documents').select('id,storage_path,original_name,size_bytes,content_type,is_active,created_at').eq('user_id', req.user.id).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'Resumes could not be loaded.', 'RESUMES_FAILED');
  res.json({ items: data || [] });
});

export const registerResume = asyncHandler(async (req, res) => {
  const { path, original_name, size_bytes } = req.body;
  if (!path.startsWith(`${req.user.id}/`)) throw new ApiError(403, 'Invalid resume path.', 'RESUME_PATH_FORBIDDEN');
  const { data: blob, error: downloadError } = await serviceDb.storage.from('resumes').download(path);
  if (downloadError || !blob) throw new ApiError(400, 'Uploaded resume could not be verified.', 'RESUME_VERIFY_FAILED');
  if (blob.size > 5 * 1024 * 1024) { await serviceDb.storage.from('resumes').remove([path]); throw new ApiError(400, 'Resume must be 5 MB or smaller.', 'RESUME_TOO_LARGE'); }
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const magic = String.fromCharCode(...head);
  if (magic !== '%PDF-') { await serviceDb.storage.from('resumes').remove([path]); throw new ApiError(400, 'Only valid PDF resumes are accepted.', 'RESUME_NOT_PDF'); }
  if (Number(size_bytes) !== blob.size) { await serviceDb.storage.from('resumes').remove([path]); throw new ApiError(400, 'Resume size verification failed.', 'RESUME_SIZE_MISMATCH'); }
  const { data, error } = await serviceDb.from('resume_documents').insert({ user_id: req.user.id, storage_path: path, original_name, size_bytes: blob.size, content_type: 'application/pdf' }).select('id,storage_path,original_name,size_bytes,content_type,created_at').single();
  if (error) { if (error.code === '23505') throw new ApiError(409, 'This resume has already been registered.', 'RESUME_ALREADY_REGISTERED'); throw new ApiError(400, 'Resume could not be registered.', 'RESUME_REGISTER_FAILED'); }
  await safeAudit(req, { action: 'resume.upload', entityType: 'resume', entityId: data.id, metadata: { size_bytes: blob.size } });
  res.status(201).json({ resume: data });
});

export const saveJob = asyncHandler(
  async (req, res) => {
    const userId =
      req.user.id;

    const jobId =
      req.params.jobId;

    const siteId =
      req.site.id;

    const siteSlug =
      req.site.slug;

    /* ===============================================
       VALIDATE JOB
    ================================================ */

    const job =
      await assertVisibleActiveJob(
        jobId,
        siteId,
      );

    /* ===============================================
       CHECK EXISTING SAVED JOB
    ================================================ */

    const {
      data: existingSavedJob,
      error: existingError,
    } = await serviceDb
      .from('saved_jobs')
      .select(
        `
          user_id,
          job_id,
          saved_via_site_id,
          created_at
        `,
      )
      .eq(
        'user_id',
        userId,
      )
      .eq(
        'job_id',
        job.id,
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        'SAVE JOB CHECK ERROR:',
        existingError,
      );

      throw new ApiError(
        500,
        'The saved job could not be checked.',
        'SAVE_JOB_CHECK_FAILED',
        existingError.message,
      );
    }

    /* ===============================================
       ALREADY SAVED

       Treat duplicate save as success.
    ================================================ */

    if (existingSavedJob) {
      return res
        .status(200)
        .json({
          saved: true,

          alreadySaved:
            true,

          jobId:
            job.id,

          savedViaSiteId:
            existingSavedJob
              .saved_via_site_id,

          savedJob:
            existingSavedJob,
        });
    }

    /* ===============================================
       INSERT

       FIX:
       saved_via_site_id must be included.
    ================================================ */

    const {
      data: savedJob,
      error: saveError,
    } = await serviceDb
      .from('saved_jobs')
      .insert({
        user_id:
          userId,

        job_id:
          job.id,

        saved_via_site_id:
          siteId,
      })
      .select(
        `
          user_id,
          job_id,
          saved_via_site_id,
          created_at
        `,
      )
      .single();

    if (saveError) {
      console.error(
        'SAVE JOB ERROR:',
        saveError,
      );

      /*
       * Handle duplicate safely in case two requests
       * arrive at almost exactly the same time.
       */
      if (
        saveError.code ===
        '23505'
      ) {
        return res
          .status(200)
          .json({
            saved: true,

            alreadySaved:
              true,

            jobId:
              job.id,

            savedViaSiteId:
              siteId,
          });
      }

      throw new ApiError(
        400,
        'The job could not be saved.',
        'SAVE_JOB_FAILED',
        saveError.message,
      );
    }

    /* ===============================================
       AUDIT
    ================================================ */

    await safeAudit(req, {
      action:
        'job.save',

      entityType:
        'job',

      entityId:
        job.id,

      metadata: {
        user_id:
          userId,

        saved_via_site_id:
          siteId,

        site:
          siteSlug,
      },
    });

    /* ===============================================
       RESPONSE
    ================================================ */

    return res
      .status(201)
      .json({
        saved: true,

        alreadySaved:
          false,

        jobId:
          job.id,

        savedViaSiteId:
          siteId,

        savedJob,
      });
  },
);

/* =========================================================
   UNSAVE JOB
========================================================= */

export const unsaveJob = asyncHandler(
  async (req, res) => {
    const userId =
      req.user.id;

    const jobId =
      req.params.jobId;

    /* ===============================================
       DELETE ONLY THIS USER'S SAVE
    ================================================ */

    const {
      data: removed,
      error: deleteError,
    } = await serviceDb
      .from('saved_jobs')
      .delete()
      .eq(
        'user_id',
        userId,
      )
      .eq(
        'job_id',
        jobId,
      )
      .select(
        `
          job_id,
          saved_via_site_id
        `,
      );

    if (deleteError) {
      console.error(
        'UNSAVE JOB ERROR:',
        deleteError,
      );

      throw new ApiError(
        400,
        'The saved job could not be removed.',
        'UNSAVE_JOB_FAILED',
        deleteError.message,
      );
    }

    /* ===============================================
       AUDIT
    ================================================ */

    await safeAudit(req, {
      action:
        'job.unsave',

      entityType:
        'job',

      entityId:
        jobId,

      metadata: {
        user_id:
          userId,

        site:
          req.site.slug,

        site_id:
          req.site.id,
      },
    });

    /* ===============================================
       RESPONSE
    ================================================ */

    return res
      .status(200)
      .json({
        saved:
          false,

        jobId,

        removed:
          Boolean(
            removed?.length,
          ),
      });
  },
);

export const getOwnResumeUrl = asyncHandler(async (req, res) => {
  const resumeId = req.query.id ? String(req.query.id) : null;
  let query = serviceDb
    .from('resume_documents')
    .select('id,storage_path,original_name,created_at')
    .eq('user_id', req.user.id)
    .eq('is_active', true)
    .is('deleted_at', null);

  if (resumeId) query = query.eq('id', resumeId);
  else query = query.order('created_at', { ascending: false }).limit(1);

  const { data, error } = resumeId ? await query.maybeSingle() : await query.maybeSingle();
  if (error || !data) throw new ApiError(404, 'Resume not found.', 'RESUME_NOT_FOUND');

  const { data: signed, error: signedError } = await serviceDb.storage.from('resumes').createSignedUrl(data.storage_path, 300);
  if (signedError || !signed?.signedUrl) throw new ApiError(404, 'Resume is not available.', 'RESUME_URL_FAILED');

  await safeAudit(req, { action: 'resume.view', entityType: 'resume', entityId: data.id });
  res.json({ url: signed.signedUrl, expiresIn: 300, resume: data });
});

/* =========================================================
   APPLY TO JOB
========================================================= */

export const applyToJob = asyncHandler(
  async (req, res) => {
    const job =
      await assertVisibleActiveJob(
        req.params.jobId,
        req.site.id,
      );

    let resumePath =
      req.body.resume_path ||
      null;

    /* ===============================================
       USE PROFILE DEFAULT RESUME
    ================================================ */

    if (!resumePath) {
      const {
        data: profile,
        error: profileError,
      } = await serviceDb
        .from('profiles')
        .select(
          'default_resume_path',
        )
        .eq(
          'id',
          req.user.id,
        )
        .single();

      if (profileError) {
        console.error(
          'APPLICATION PROFILE ERROR:',
          profileError,
        );

        throw new ApiError(
          500,
          'Your profile could not be loaded.',
          'PROFILE_LOAD_FAILED',
          profileError.message,
        );
      }

      resumePath =
        profile
          ?.default_resume_path ||
        null;
    }

    /* ===============================================
       REQUIRE RESUME
    ================================================ */

    if (!resumePath) {
      throw new ApiError(
        400,
        'Add a resume to your profile before applying to jobs.',
        'RESUME_REQUIRED',
      );
    }

    // Never trust a browser-supplied storage path. The resume must belong to the
    // authenticated applicant and be present in the registered resume table.
    const { data: resume, error: resumeError } = await serviceDb
      .from('resume_documents')
      .select('id,storage_path')
      .eq('user_id', req.user.id)
      .eq('storage_path', resumePath)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (resumeError || !resume) {
      throw new ApiError(403, 'The selected resume is not owned by your account.', 'RESUME_FORBIDDEN');
    }

    /* ===============================================
       CREATE APPLICATION
    ================================================ */

    // 🔥 YAHAN FIX HAI: req.db ko serviceDb kar diya gaya hai
    const {
      data,
      error,
    } = await serviceDb
      .from('applications')
      .insert({
        job_id:
          job.id,

        applicant_id:
          req.user.id,

        resume_path:
          resumePath,

        cover_letter:
          req.body
            .cover_letter ||
          null,

        applied_via_site_id:
          req.site.id,

        status:
          'submitted',
      })
      .select(
        `
          id,
          status,
          created_at
        `,
      )
      .single();

    /* ===============================================
       DUPLICATE APPLICATION
    ================================================ */

    if (
      error?.code ===
      '23505'
    ) {
      throw new ApiError(
        409,
        'You have already applied to this job.',
        'ALREADY_APPLIED',
      );
    }

    /* ===============================================
       OTHER ERROR
    ================================================ */

    if (error) {
      console.error(
        'APPLICATION ERROR:',
        error,
      );

      throw new ApiError(
        400,
        'Your application could not be submitted.',
        'APPLICATION_FAILED',
        error.message,
      );
    }

    /* ===============================================
       AUDIT
    ================================================ */

    await safeAudit(req, {
      action:
        'application.create',

      entityType:
        'application',

      entityId:
        data.id,

      metadata: {
        job_id:
          job.id,

        applied_via_site:
          req.site.slug,

        applied_via_site_id:
          req.site.id,
      },
    });

    /* ===============================================
       RESPONSE
    ================================================ */

    return res
      .status(201)
      .json({
        application:
          data,
      });
  },
);
/**
 * Job Seeker vs Job Match Analysis & Edge Case Validation Engine
 * Evaluates skills, domain relevance, experience, location, and resume completeness.
 */

// Domain trade keywords (non-tech trades that indicate mismatch when applying to software roles)
const NON_TECH_DOMAINS = {
  culinary: [
    'cook', 'cooking', 'chef', 'culinary', 'baking', 'baker', 'kitchen', 'restaurant',
    'barista', 'catering', 'food prep', 'food safety', 'dishwasher', 'sous chef', 'grill cook'
  ],
  electrician_and_trades: [
    'electrician', 'electrical', 'wiring', 'circuit', 'plumber', 'plumbing', 'pipefitting',
    'carpenter', 'carpentry', 'welder', 'welding', 'hvac', 'masonry', 'mechanic', 'machinist',
    'conduit', 'breaker', 'technician apprentice'
  ],
  transport_logistics: [
    'driver', 'truck driver', 'delivery driver', 'courier', 'forklift', 'chauffeur',
    'warehouse worker', 'loader', 'mover', 'dispatch'
  ],
  general_services: [
    'cashier', 'retail associate', 'cleaner', 'janitor', 'housekeeping', 'security guard',
    'store clerk', 'stocker'
  ],
};

const TECH_KEYWORDS = [
  'software', 'developer', 'engineer', 'frontend', 'front-end', 'backend', 'back-end',
  'fullstack', 'full-stack', 'web developer', 'mobile developer', 'react', 'node',
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'sql', 'devops', 'cloud',
  'aws', 'api', 'database', 'git', 'docker', 'kubernetes', 'html', 'css', 'programming'
];

/**
 * Normalizes skill strings and flattens comma-separated lists
 */
export function extractSkillTokens(skillsList) {
  if (!skillsList) return [];
  const list = Array.isArray(skillsList) ? skillsList : [skillsList];
  const tokens = new Set();

  list.forEach((item) => {
    if (typeof item !== 'string') return;
    // Split by comma, slash, or semicolons if packed into one string
    item.split(/[,;/]+/).forEach((part) => {
      const clean = part.replace(/^[-*•\d.\s]+/, '').trim();
      if (clean.length > 1) {
        tokens.add(clean);
      }
    });
  });

  return Array.from(tokens);
}

/**
 * Checks if a candidate's skill matches a required job skill
 */
function isSkillEquivalent(candSkill, jobSkill) {
  const c = candSkill.toLowerCase().trim();
  const j = jobSkill.toLowerCase().trim();

  if (c === j) return true;
  if (c.includes(j) || j.includes(c)) return true;

  // Common aliases
  const aliases = [
    ['js', 'javascript'],
    ['ts', 'typescript'],
    ['react', 'react.js', 'reactjs'],
    ['node', 'node.js', 'nodejs'],
    ['next', 'next.js', 'nextjs'],
    ['postgres', 'postgresql'],
    ['mongo', 'mongodb'],
    ['rest', 'rest api', 'rest apis', 'restful api', 'restful apis'],
    ['c#', '.net', 'dotnet'],
    ['vue', 'vue.js', 'vuejs'],
    ['k8s', 'kubernetes'],
    ['golang', 'go'],
  ];

  for (const group of aliases) {
    const cMatch = group.some((term) => c === term || c.includes(term));
    const jMatch = group.some((term) => j === term || j.includes(term));
    if (cMatch && jMatch) return true;
  }

  return false;
}

/**
 * Calculates estimated candidate total years of experience
 */
export function calculateCandidateExperienceYears(experienceList, headline = '') {
  let totalMonths = 0;

  if (Array.isArray(experienceList) && experienceList.length > 0) {
    experienceList.forEach((exp) => {
      if (!exp || typeof exp !== 'object') return;
      const start = exp.start_date ? new Date(exp.start_date) : null;
      const end = exp.current || !exp.end_date ? new Date() : new Date(exp.end_date);

      if (start && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += Math.max(1, diffMonths);
      } else {
        // Fallback default duration if dates are not parseable but job is listed
        totalMonths += 12;
      }
    });
  }

  let years = Math.round((totalMonths / 12) * 10) / 10;

  // Headline heuristic if experience list is empty
  if (years === 0 && headline) {
    const h = headline.toLowerCase();
    if (h.includes('senior') || h.includes('lead') || h.includes('principal') || h.includes('staff')) {
      years = 5;
    } else if (h.includes('mid') || h.includes('experienced')) {
      years = 3;
    } else if (h.includes('junior') || h.includes('entry') || h.includes('associate')) {
      years = 1;
    }
  }

  return years;
}

/**
 * Minimum years recommended for experience levels
 */
export const EXPERIENCE_LEVEL_REQUIREMENTS = {
  entry_level: { label: 'Entry Level', minYears: 0, maxYears: 2 },
  mid_level: { label: 'Mid Level', minYears: 2, maxYears: 5 },
  senior: { label: 'Senior Level', minYears: 5, maxYears: 10 },
  executive: { label: 'Executive / Director', minYears: 8, maxYears: 30 },
  lead: { label: 'Team Lead / Principal', minYears: 6, maxYears: 20 },
};

/**
 * Comprehensive Match Analysis
 */
export function analyzeJobMatch(job, profile) {
  if (!job) {
    return {
      fitScore: 0,
      fitTier: 'mismatch',
      skills: { matched: [], missing: [], isDomainMismatch: false },
      experience: { isMatch: false },
      location: { isMatch: false },
      resume: { isPresent: false },
      canApplyDirectly: false,
      warnings: [],
    };
  }

  const warnings = [];
  const candidateSkills = extractSkillTokens(profile?.skills || []);
  const candidateHeadline = (profile?.headline || '').trim();
  const candidateCity = (profile?.location_city || '').trim();
  const candidateProvince = (profile?.location_province || '').trim();
  const candidateExpYears = calculateCandidateExperienceYears(profile?.experience, candidateHeadline);
  const hasResume = Boolean(profile?.default_resume_path && profile.default_resume_path.trim());

  // 1. SKILLS EVALUATION
  const jobSkills = extractSkillTokens(job.skills || []);
  const matchedSkills = [];
  const missingSkills = [];

  jobSkills.forEach((jSkill) => {
    const match = candidateSkills.some((cSkill) => isSkillEquivalent(cSkill, jSkill));
    if (match) {
      matchedSkills.push(jSkill);
    } else {
      missingSkills.push(jSkill);
    }
  });

  const skillMatchRate = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) : 1;

  // 2. DOMAIN MISMATCH CHECK (e.g. Electrician or Cook applying for Software Engineer)
  const jobTitleAndDesc = `${job.title || ''} ${job.description || ''} ${job.categoryName || ''}`.toLowerCase();
  const isTechJob = TECH_KEYWORDS.some((kw) => jobTitleAndDesc.includes(kw));

  let isDomainMismatch = false;
  let domainMismatchCategory = '';
  let domainMismatchReason = '';

  if (isTechJob && matchedSkills.length === 0) {
    const candidateCorpus = `${candidateHeadline} ${candidateSkills.join(' ')}`.toLowerCase();

    for (const [category, keywords] of Object.entries(NON_TECH_DOMAINS)) {
      const foundNonTech = keywords.some((kw) => candidateCorpus.includes(kw));
      if (foundNonTech) {
        isDomainMismatch = true;
        domainMismatchCategory = category;
        break;
      }
    }

    if (isDomainMismatch) {
      const domainName =
        domainMismatchCategory === 'culinary'
          ? 'Culinary & Food Services (Cook / Chef)'
          : domainMismatchCategory === 'electrician_and_trades'
          ? 'Electrical & Skilled Trades (Electrician / Technician)'
          : domainMismatchCategory === 'transport_logistics'
          ? 'Logistics & Transportation'
          : 'Service & Retail';

      domainMismatchReason = `Trade Mismatch: Your profile indicates background in ${domainName}. This opening requires software engineering skills (${jobSkills.slice(0, 4).join(', ')}).`;
      warnings.push(domainMismatchReason);
    } else if (candidateSkills.length > 0 && jobSkills.length > 0) {
      // General skill mismatch
      warnings.push(`Skills Mismatch: You have 0 of the ${jobSkills.length} required skills for this role.`);
    }
  } else if (missingSkills.length > 0 && jobSkills.length > 0) {
    if (skillMatchRate < 0.5) {
      warnings.push(`You match ${matchedSkills.length} of ${jobSkills.length} required skills. Missing: ${missingSkills.slice(0, 3).join(', ')}.`);
    }
  }

  // 3. EXPERIENCE LEVEL CHECK
  const normLevel = (job.experienceLevel || '').toLowerCase().replace(/[\s-]+/g, '_');
  const levelReq = EXPERIENCE_LEVEL_REQUIREMENTS[normLevel] || {
    label: job.experienceLevel || 'Not Specified',
    minYears: 0,
    maxYears: 100,
  };

  const experienceMatch = candidateExpYears >= levelReq.minYears;
  let experienceReason = '';
  if (!experienceMatch) {
    experienceReason = `This position requires ${levelReq.label} (${levelReq.minYears}+ years experience). Your profile lists ${candidateExpYears === 0 ? 'no recorded' : candidateExpYears + ' year(s) of'} professional experience.`;
    warnings.push(experienceReason);
  } else {
    experienceReason = `${candidateExpYears} years of verified experience meets ${levelReq.label} requirements.`;
  }

  // 4. LOCATION & WORKPLACE CHECK
  const isRemote = job.isRemote || job.workplaceType === 'remote';
  const jobCity = (job.city || '').trim().toLowerCase();
  const jobProvince = (job.province || '').trim().toLowerCase();
  let locationMatch = false;
  let locationReason = '';

  if (isRemote) {
    locationMatch = true;
    locationReason = 'Remote opportunity: Eligible candidates from all locations may apply.';
  } else {
    const jobLocString = [job.city, job.province].filter(Boolean).join(', ') || 'Specified location';
    if (!candidateCity) {
      locationMatch = false;
      locationReason = `This is an in-person / ${job.workplaceType || 'On-site'} position based in ${jobLocString}. Your profile location is not set.`;
      warnings.push(locationReason);
    } else {
      const candCityLower = candidateCity.toLowerCase();
      const candProvLower = candidateProvince.toLowerCase();
      const cityMatches = jobCity && (candCityLower.includes(jobCity) || jobCity.includes(candCityLower));
      const provMatches = jobProvince && (candProvLower.includes(jobProvince) || jobProvince.includes(candProvLower));

      if (cityMatches || provMatches) {
        locationMatch = true;
        locationReason = `Location matches: ${jobLocString} (${job.workplaceType || 'On-site'}).`;
      } else {
        locationMatch = false;
        locationReason = `Location Mismatch: Role is ${job.workplaceType || 'On-site'} in ${jobLocString}. Your current location is ${candidateCity}${candidateProvince ? `, ${candidateProvince}` : ''}.`;
        warnings.push(locationReason);
      }
    }
  }

  // 5. RESUME CHECK
  if (!hasResume) {
    warnings.push('Resume Missing: You must upload a resume to your profile before applying.');
  }

  // 6. FIT SCORE COMPUTATION
  let score = 0;
  if (isDomainMismatch) {
    // Hard cap for direct domain mismatches (Cook/Electrician on Software Job)
    score = 15;
  } else {
    // Weighted points:
    // Skills: up to 45 pts
    const skillPoints = jobSkills.length > 0 ? (skillMatchRate * 45) : 35;
    // Experience: up to 25 pts
    const expPoints = experienceMatch ? 25 : Math.max(5, Math.min(20, (candidateExpYears / Math.max(1, levelReq.minYears)) * 25));
    // Location: up to 20 pts
    const locPoints = locationMatch ? 20 : 5;
    // Resume: 10 pts
    const resPoints = hasResume ? 10 : 0;

    score = Math.round(skillPoints + expPoints + locPoints + resPoints);
  }

  let fitTier = 'mismatch';
  if (score >= 85) fitTier = 'exceptional';
  else if (score >= 65) fitTier = 'good';
  else if (score >= 40) fitTier = 'moderate';
  else fitTier = 'mismatch';

  const allRequirementsFulfilled =
    !isDomainMismatch &&
    matchedSkills.length >= Math.min(2, jobSkills.length) &&
    experienceMatch &&
    locationMatch &&
    hasResume;

  const canApplyDirectly = allRequirementsFulfilled;

  return {
    fitScore: score,
    fitTier,
    allRequirementsFulfilled,
    canApplyDirectly,
    isDomainMismatch,
    domainMismatchReason,
    skills: {
      jobSkills,
      candidateSkills,
      matched: matchedSkills,
      missing: missingSkills,
      matchRate: Math.round(skillMatchRate * 100),
      isDomainMismatch,
    },
    experience: {
      requiredLevel: levelReq.label,
      requiredYearsMin: levelReq.minYears,
      candidateYears: candidateExpYears,
      isMatch: experienceMatch,
      reason: experienceReason,
    },
    location: {
      isRemote,
      workplaceType: job.workplaceType || 'On-site',
      jobLocation: [job.city, job.province].filter(Boolean).join(', ') || 'Remote',
      candidateLocation: [candidateCity, candidateProvince].filter(Boolean).join(', ') || 'Not specified',
      isMatch: locationMatch,
      reason: locationReason,
    },
    resume: {
      isPresent: hasResume,
      path: profile?.default_resume_path || null,
    },
    profileCompleteness: {
      hasBasicInfo: Boolean(profile?.full_name?.trim() && profile?.phone?.trim()),
      hasSkills: candidateSkills.length > 0,
      hasExperience: Array.isArray(profile?.experience) && profile.experience.length > 0,
      hasResume,
    },
    warnings,
  };
}

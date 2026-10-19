const trim = (value) => typeof value === 'string' ? value.trim() : '';
const optional = (value) => trim(value) || null;

export function accountPayload(value = {}) {
  return { full_name: trim(value.full_name), phone: optional(value.phone) };
}

export function validateAccount(value) {
  const account = accountPayload(value);
  const errors = {};
  if (account.full_name.length < 2) errors.full_name = 'Enter at least 2 characters.';
  else if (account.full_name.length > 160) errors.full_name = 'Use 160 characters or fewer.';
  if (account.phone?.length > 50) errors.phone = 'Use 50 characters or fewer.';
  return errors;
}

export function validatePassword(value = {}) {
  const errors = {};
  if (!value.currentPassword) errors.currentPassword = 'Enter your current password.';
  if (!value.newPassword || value.newPassword.length < 8) errors.newPassword = 'Use at least 8 characters.';
  else if (value.newPassword === value.currentPassword) errors.newPassword = 'Choose a different password from your current password.';
  if (!value.confirmPassword) errors.confirmPassword = 'Confirm your new password.';
  else if (value.newPassword !== value.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

function array(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const result = JSON.parse(value); return Array.isArray(result) ? result : []; } catch { return []; }
  }
  return [];
}

export function seekerProfilePayload(value = {}) {
  const dates = (item) => ({ startDate: optional(item.startDate), endDate: item.current ? null : optional(item.endDate), current: Boolean(item.current) });
  return {
    ...accountPayload(value), headline: optional(value.headline), location_city: optional(value.location_city),
    location_province: optional(value.location_province), skills: array(value.skills).map(trim).filter(Boolean),
    default_resume_path: optional(value.default_resume_path),
    experience: array(value.experience).map((item) => ({ title: trim(item.title), company: trim(item.company), ...dates(item), description: optional(item.description) })),
    education: array(value.education).map((item) => ({ degree: trim(item.degree), institution: trim(item.institution), ...dates(item), field: optional(item.field) })),
  };
}

export function seekerProfileForm(value = {}) {
  const profile = seekerProfilePayload(value);
  return {
    ...profile, phone: profile.phone || '', headline: profile.headline || '', location_city: profile.location_city || '',
    location_province: profile.location_province || '', default_resume_path: profile.default_resume_path || '',
    experience: profile.experience.map((item) => ({ ...item, isEditing: false })),
    education: profile.education.map((item) => ({ ...item, isEditing: false })),
  };
}

export function samePayload(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function validateSeekerProfile(value, resumeFile, today = new Date().toISOString().slice(0, 10)) {
  const profile = seekerProfilePayload(value);
  const errors = validateAccount(profile);
  for (const [field, max] of [['headline', 220], ['location_city', 120], ['location_province', 120]]) {
    if (profile[field]?.length > max) errors[field] = `Use ${max} characters or fewer.`;
  }
  if (profile.skills.length > 50) errors.skills = 'Add up to 50 skills.';
  array(value.skills).forEach((skill, index) => { if (trim(skill).length > 80) errors[`skills.${index}`] = 'Use 80 characters or fewer.'; });
  for (const [group, fields] of [['experience', ['title', 'company']], ['education', ['degree', 'institution']]]) {
    if (profile[group].length > 20) errors[group] = 'Add up to 20 entries.';
    profile[group].forEach((item, index) => {
      const key = (field) => `${group}.${index}.${field}`;
      for (const field of fields) {
        if (!item[field]) errors[key(field)] = 'This field is required.';
        else if (item[field].length > 180) errors[key(field)] = 'Use 180 characters or fewer.';
      }
      if (item.description?.length > 4000) errors[key('description')] = 'Use 4,000 characters or fewer.';
      if (item.field?.length > 180) errors[key('field')] = 'Use 180 characters or fewer.';
      if (item.startDate && item.startDate > today) errors[key('startDate')] = 'Start date cannot be in the future.';
      if (item.endDate && item.endDate > today) errors[key('endDate')] = 'End date cannot be in the future.';
      else if (item.startDate && item.endDate && item.startDate > item.endDate) errors[key('endDate')] = 'End date must be on or after the start date.';
    });
  }
  if (resumeFile) {
    if (!resumeFile.size) errors.resume = 'Choose a resume file that is not empty.';
    else if (resumeFile.size > 10 * 1024 * 1024) errors.resume = 'Choose a resume file of 10 MB or smaller.';
    else if (!/\.(pdf|docx)$/i.test(resumeFile.name)) errors.resume = 'Choose a PDF or DOCX file.';
    else if (resumeFile.name.length > 255) errors.resume = 'Use a file name of 255 characters or fewer.';
  }
  return errors;
}

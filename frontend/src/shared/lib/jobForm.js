const clean = value => typeof value === 'string' ? value.trim() : '';
const salary = value => clean(String(value ?? '')) === '' ? null : Number(value);
export function jobPayload(form) {
  return {
    title: clean(form.title), category_id: Number(form.category_id), workplace_type: form.workplace_type,
    is_remote: form.workplace_type === 'remote', employment_type: form.employment_type, experience_level: form.experience_level,
    city: form.workplace_type === 'remote' ? null : clean(form.city) || null,
    province: form.workplace_type === 'remote' ? null : clean(form.province) || null,
    salary_min: salary(form.salary_min), salary_max: salary(form.salary_max), salary_currency: form.salary_currency,
    salary_period: form.salary_period, skills: (form.skills || '').split(',').map(clean).filter(Boolean),
    description: clean(form.description), audience_sites: form.audience_sites || [],
  };
}
export function validateJobForm(form, categories = []) {
  const values = jobPayload(form);
  const errors = {};
  if (values.title.length < 3) errors.title = ['Enter a job title with at least 3 characters.'];
  else if (values.title.length > 180) errors.title = ['Use no more than 180 characters.'];
  if (!Number.isInteger(values.category_id) || values.category_id <= 0 || values.category_id > 32767 || (categories.length && !categories.some(item => Number(item.id) === values.category_id))) errors.category_id = ['Choose a valid job category.'];
  if (values.description.length < 20) errors.description = ['Describe the job using at least 20 characters.'];
  else if (values.description.length > 30000) errors.description = ['Use no more than 30000 characters.'];
  for (const name of ['salary_min', 'salary_max']) {
    if (values[name] !== null && (!Number.isFinite(values[name]) || values[name] < 0)) errors[name] = ['Enter a valid salary of zero or more.'];
  }
  if (!errors.salary_min && !errors.salary_max && values.salary_min !== null && values.salary_max !== null && values.salary_max < values.salary_min) errors.salary_max = ['Maximum salary cannot be lower than minimum salary.'];
  for (const name of ['city', 'province']) if (values[name]?.length > 120) errors[name] = ['Use no more than 120 characters.'];
  if (values.skills.length > 50) errors.skills = ['Add no more than 50 skills.'];
  else if (values.skills.some(skill => skill.length > 80)) errors.skills = ['Keep each skill within 80 characters.'];
  return errors;
}

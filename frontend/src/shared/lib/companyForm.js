const clean = value => typeof value === 'string' ? value.trim() : '';

export function companyPayload(form) {
  const payload = {
    website: clean(form.website),
    registration_number: clean(form.registration_number),
    description: clean(form.description) || null,
  };
  // The database locks the name after creation, even when other fields change.
  if (!form.id) payload.name = clean(form.name);
  return payload;
}

export function companyChanges(form, baseline) {
  const values = companyPayload(form);
  if (!form.id || !baseline || baseline.id !== form.id) return values;
  const previous = companyPayload(baseline);
  return Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== previous[field]));
}

export function validateCompanyForm(form, baseline) {
  const values = companyPayload(form);
  const changes = form.id && baseline ? companyChanges(form, baseline) : values;
  const shouldValidate = field => Object.hasOwn(changes, field);
  const errors = {};
  const length = (field, min, max) => {
    if (!shouldValidate(field)) return;
    if (!values[field] || values[field].length < min) errors[field] = [`Use at least ${min} characters.`];
    else if (values[field].length > max) errors[field] = [`Use no more than ${max} characters.`];
  };
  if (!form.id) length('name', 2, 180);
  length('registration_number', 2, 180);
  if (shouldValidate('website') && !values.website) errors.website = ['Enter your company website.'];
  else if (shouldValidate('website')) {
    try {
      const url = new URL(values.website);
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname) throw new Error();
    } catch { errors.website = ['Enter a valid website URL including https://.']; }
    if (values.website.length > 1000) errors.website = ['Use no more than 1000 characters.'];
  }
  if (shouldValidate('description') && values.description?.length > 10000) errors.description = ['Use no more than 10000 characters.'];
  return errors;
}
